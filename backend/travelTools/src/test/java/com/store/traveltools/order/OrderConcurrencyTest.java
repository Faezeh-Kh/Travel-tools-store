package com.store.traveltools.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.fail;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.store.traveltools.AbstractIntegrationTest;
import com.store.traveltools.cart.CartService;
import com.store.traveltools.cart.dto.AddCartItemRequest;
import com.store.traveltools.common.exception.ConflictException;
import com.store.traveltools.order.dto.PlaceOrderRequest;

// Plain @SpringBootTest with no test transaction, so each thread runs its own, independently committing
// transaction (see CartConcurrencyTest for the same setup).
@SpringBootTest
class OrderConcurrencyTest extends AbstractIntegrationTest {

    private static final PlaceOrderRequest REQUEST = new PlaceOrderRequest("علی", "رضایی", "09121234567",
            "خیابان آزادی، پلاک ۱۰", "تهران", "1234567890", null);

    @Autowired
    private OrderService orderService;

    @Autowired
    private CartService cartService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Long createVariant(String sku, int stock) {
        String slug = "order-concurrency-" + sku.toLowerCase();
        Long categoryId = jdbcTemplate.queryForObject(
                "INSERT INTO categories (name, slug, description, active) VALUES (?, ?, ?, TRUE) RETURNING id",
                Long.class, "Category " + sku, "category-" + slug, "Fixture.");
        Long productId = jdbcTemplate.queryForObject(
                """
                INSERT INTO products (category_id, name, slug, short_description, description, images,
                        specifications, active)
                VALUES (?, ?, ?, ?, ?, '[]'::jsonb, '{}'::jsonb, TRUE) RETURNING id
                """,
                Long.class, categoryId, "Product " + sku, "product-" + slug, "Short description.",
                "Full description.");
        return jdbcTemplate.queryForObject(
                "INSERT INTO product_variants (product_id, sku, attributes, price, stock_quantity, active) "
                        + "VALUES (?, ?, '{}'::jsonb, ?, ?, TRUE) RETURNING id",
                Long.class, productId, sku, new BigDecimal("100.00"), stock);
    }

    private UUID cartWith(Long variantId, int quantity) {
        return cartService.addItem(null, new AddCartItemRequest(variantId, quantity)).id();
    }

    private int stockOf(Long variantId) {
        return jdbcTemplate.queryForObject("SELECT stock_quantity FROM product_variants WHERE id = ?", Integer.class,
                variantId);
    }

    private int orderItemCountForSku(String sku) {
        return jdbcTemplate.queryForObject("SELECT count(*) FROM order_items WHERE sku = ?", Integer.class, sku);
    }

    // A deterministic proof of the mechanism, not timing luck: A checks out inside an outer transaction
    // that it deliberately keeps open, so it holds the variant lock. The test then waits until PostgreSQL
    // itself reports B's session as blocked by A's, and once A commits, B must see A's reduced stock and
    // fail - not sell the same last unit again.
    @Test
    void secondCheckoutOfTheLastUnit_waitsForTheFirstAndThenFailsOnTheUpdatedStock() throws Exception {
        Long variantId = createVariant("ORDER-RACE-LAST-UNIT", 1);
        UUID cartA = cartWith(variantId, 1);
        UUID cartB = cartWith(variantId, 1);
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        CompletableFuture<Integer> aPid = new CompletableFuture<>();
        CompletableFuture<Integer> bPid = new CompletableFuture<>();
        CountDownLatch aHasOrdered = new CountDownLatch(1);
        CountDownLatch releaseA = new CountDownLatch(1);

        // Each checkout records its database session id first; placeOrder joins the surrounding transaction,
        // so it runs on that same session.
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> checkoutA = executor.submit(() -> transactionTemplate.executeWithoutResult(status -> {
                aPid.complete(currentBackendPid());
                orderService.placeOrder(cartA, REQUEST);
                aHasOrdered.countDown();
                awaitRelease(releaseA);
            }));
            try {
                assertThat(aHasOrdered.await(5, TimeUnit.SECONDS)).as("A placed its order").isTrue();

                Future<?> checkoutB = executor.submit(() -> transactionTemplate.executeWithoutResult(status -> {
                    bPid.complete(currentBackendPid());
                    orderService.placeOrder(cartB, REQUEST);
                }));
                awaitBlockedOnVariantLock(bPid.get(5, TimeUnit.SECONDS), aPid.get(5, TimeUnit.SECONDS));

                releaseA.countDown();
                checkoutA.get(10, TimeUnit.SECONDS);
                assertThatThrownBy(() -> checkoutB.get(10, TimeUnit.SECONDS))
                        .isInstanceOf(ExecutionException.class)
                        .hasCauseInstanceOf(ConflictException.class);
            } finally {
                // Never leave A holding its lock if anything above failed; a second countDown is harmless.
                releaseA.countDown();
            }
        }

        assertThat(stockOf(variantId)).isZero();
        assertThat(orderItemCountForSku("ORDER-RACE-LAST-UNIT")).isEqualTo(1);
        assertThat(cartService.getCart(cartB).items()).as("the losing cart keeps its item")
                .singleElement()
                .satisfies(item -> assertThat(item.quantity()).isEqualTo(1));
    }

    @Test
    void concurrentCheckoutsWithEnoughStock_bothSucceedAndNeitherReductionIsLost() throws Exception {
        Long variantId = createVariant("ORDER-RACE-ENOUGH", 10);
        UUID cartA = cartWith(variantId, 2);
        UUID cartB = cartWith(variantId, 3);

        List<Throwable> failures = runConcurrently(List.of(cartA, cartB));

        assertThat(failures).isEmpty();
        assertThat(stockOf(variantId)).isEqualTo(5);
        assertThat(orderItemCountForSku("ORDER-RACE-ENOUGH")).isEqualTo(2);
    }

    // Two carts holding the same two variants, added in opposite order; both checkouts must succeed.
    // Locking in each cart's own item order could deadlock (A holds variant 1 and waits for 2, B holds 2 and
    // waits for 1), which PostgreSQL resolves by aborting one checkout. This is a regression test, not
    // proof: nothing forces the two checkouts to interleave, so it can pass even with a bad lock order. The
    // sorted lock order itself is pinned by OrderServiceTest (the lock call) and ProductVariantRepositoryTest
    // (rows returned, and therefore locked, in id order).
    @Test
    void concurrentCheckoutsOfOverlappingVariants_doNotDeadlock() throws Exception {
        Long first = createVariant("ORDER-RACE-OVERLAP-1", 10);
        Long second = createVariant("ORDER-RACE-OVERLAP-2", 10);
        UUID cartA = cartWith(first, 1);
        cartService.addItem(cartA, new AddCartItemRequest(second, 1));
        UUID cartB = cartWith(second, 1);
        cartService.addItem(cartB, new AddCartItemRequest(first, 1));

        List<Throwable> failures = runConcurrently(List.of(cartA, cartB));

        assertThat(failures).isEmpty();
        assertThat(stockOf(first)).isEqualTo(8);
        assertThat(stockOf(second)).isEqualTo(8);
    }

    @Test
    void concurrentSubmitsOfTheSameCart_createOnlyOneOrder() throws Exception {
        Long variantId = createVariant("ORDER-RACE-DOUBLE-SUBMIT", 10);
        UUID cart = cartWith(variantId, 1);

        List<Throwable> failures = runConcurrently(List.of(cart, cart));

        assertThat(failures).hasSize(1).first().isInstanceOf(ConflictException.class);
        assertThat(stockOf(variantId)).isEqualTo(9);
        assertThat(orderItemCountForSku("ORDER-RACE-DOUBLE-SUBMIT")).isEqualTo(1);
    }

    // Starts one placeOrder per cart id at the same moment and returns the exceptions thrown, if any.
    private List<Throwable> runConcurrently(List<UUID> cartIds) throws InterruptedException {
        CyclicBarrier barrier = new CyclicBarrier(cartIds.size());
        List<Throwable> failures = new ArrayList<>();

        try (ExecutorService executor = Executors.newFixedThreadPool(cartIds.size())) {
            List<Future<Throwable>> futures = new ArrayList<>();
            for (UUID cartId : cartIds) {
                futures.add(executor.submit(() -> {
                    try {
                        barrier.await(5, TimeUnit.SECONDS);
                        orderService.placeOrder(cartId, REQUEST);
                        return null;
                    } catch (Throwable t) {
                        return t;
                    }
                }));
            }
            for (Future<Throwable> future : futures) {
                try {
                    Throwable result = future.get(10, TimeUnit.SECONDS);
                    if (result != null) {
                        failures.add(result);
                    }
                } catch (ExecutionException | TimeoutException e) {
                    failures.add(e);
                }
            }
        }
        return failures;
    }

    // Runs on the calling thread's transactional connection, so it returns that transaction's session id.
    private int currentBackendPid() {
        return jdbcTemplate.queryForObject("SELECT pg_backend_pid()", Integer.class);
    }

    // Polls until the blocked session is waiting on a lock held by the blocking session, while running the
    // variant lock query. The carts differ, so the variant row is the only row both sessions want.
    private void awaitBlockedOnVariantLock(int blockedPid, int blockingPid) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < deadline) {
            Boolean blocked = jdbcTemplate.queryForObject(
                    """
                    SELECT wait_event_type = 'Lock'
                           AND ? = ANY(pg_blocking_pids(pid))
                           AND query ILIKE '%product_variants%'
                    FROM pg_stat_activity
                    WHERE pid = ?
                    """,
                    Boolean.class, blockingPid, blockedPid);
            if (Boolean.TRUE.equals(blocked)) {
                return;
            }
            Thread.sleep(50);
        }
        fail("Session %d was not blocked by session %d on the variant lock within 5 seconds."
                .formatted(blockedPid, blockingPid));
    }

    // Fails A's transaction (rolling it back) instead of letting it commit without the test's signal.
    private static void awaitRelease(CountDownLatch release) {
        try {
            if (!release.await(30, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Checkout A was not released within 30 seconds.");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Checkout A was interrupted before it was released.", e);
        }
    }
}
