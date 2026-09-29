package com.store.traveltools.cart;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
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
import com.store.traveltools.cart.dto.AddCartItemRequest;
import com.store.traveltools.cart.dto.CartResponse;

// Deliberately plain @SpringBootTest with no @Transactional on the class: each thread below needs its
// own genuinely separate, independently-committing transaction, which a test-transaction wrapper
// (the default for e.g. @DataJpaTest) would prevent.
@SpringBootTest
class CartConcurrencyTest extends AbstractIntegrationTest {

    @Autowired
    private CartService cartService;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Long createVariant(String sku, int stock) {
        Long categoryId = jdbcTemplate.queryForObject(
                "INSERT INTO categories (name, slug, description, active) VALUES (?, ?, ?, TRUE) RETURNING id",
                Long.class, "Test Category " + sku, "test-category-for-cart-concurrency-" + sku.toLowerCase(),
                "Fixture.");
        Long productId = jdbcTemplate.queryForObject(
                """
                INSERT INTO products (category_id, name, slug, short_description, description, images,
                        specifications, active)
                VALUES (?, ?, ?, ?, ?, '[]'::jsonb, '{}'::jsonb, TRUE) RETURNING id
                """,
                Long.class, categoryId, "Test Product", "test-product-for-cart-concurrency-" + sku.toLowerCase(),
                "Short description.", "Full description.");
        return jdbcTemplate.queryForObject(
                "INSERT INTO product_variants (product_id, sku, attributes, price, stock_quantity, active) "
                        + "VALUES (?, ?, '{}'::jsonb, ?, ?, TRUE) RETURNING id",
                Long.class, productId, sku, new BigDecimal("100.00"), stock);
    }

    // Tier 1: a deterministic proof of the exact mechanism (not timing-dependent luck). Thread A locks
    // the cart (acquiring Postgres's row lock immediately, via SELECT ... FOR UPDATE), then deliberately
    // holds its transaction open. Thread B attempts the same lock while A is still holding it: B must
    // observably block (not fail, not succeed) until A commits, and only then proceed successfully -
    // proving lockById's lock genuinely takes effect and is honored by a second transaction, not merely
    // eventually/best-effort.
    @Test
    void lockById_blocksAConcurrentLockUntilTheFirstTransactionCommits() throws Exception {
        UUID cartId = cartRepository.saveAndFlush(new Cart()).getId();
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        CountDownLatch aHasLocked = new CountDownLatch(1);
        CountDownLatch releaseA = new CountDownLatch(1);

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> txnA = executor.submit(() -> transactionTemplate.executeWithoutResult(status -> {
                cartRepository.lockById(cartId);
                aHasLocked.countDown();
                awaitUninterruptibly(releaseA);
            }));

            assertThat(aHasLocked.await(5, TimeUnit.SECONDS)).as("transaction A acquired the lock").isTrue();

            Future<Void> txnB = executor.submit(() -> {
                transactionTemplate.executeWithoutResult(status -> cartRepository.lockById(cartId));
                return null;
            });

            // B should still be blocked on A's row lock at this point - neither failed nor succeeded.
            Thread.sleep(300);
            assertThat(txnB.isDone()).as("B is still blocked while A holds the lock").isFalse();

            releaseA.countDown();
            txnA.get(5, TimeUnit.SECONDS);

            // Once unblocked, B must complete normally - no exception, since the two are serialized
            // rather than racing.
            txnB.get(5, TimeUnit.SECONDS);
        }
    }

    // Tier 2a: two real concurrent addItem calls for a variant not yet in the cart. With the two
    // requests serialized by the cart-level lock, this must never surface a raw
    // DataIntegrityViolationException from the unique constraint, and both original quantities must end
    // up applied - whichever request runs second simply waits, then reads the first request's already-
    // inserted line and merges into it.
    @Test
    void concurrentInsertsOfTheSameNewVariant_serializeCleanlyAndApplyBothQuantities() throws Exception {
        Long variantId = createVariant("CART-RACE-NEW", 100);
        UUID cartId = cartRepository.saveAndFlush(new Cart()).getId();

        List<Throwable> failures = runConcurrentAdds(cartId, variantId, 2, 2);

        assertThat(failures).isEmpty();
        CartResponse cart = cartService.getCart(cartId);
        assertThat(cart.items()).hasSize(1);
        assertThat(cart.items().get(0).quantity()).isEqualTo(4);
    }

    // Tier 2b: same as above but merging into an already-existing line, which is the scenario a silent
    // lost update would show up in (the losing write would just overwrite instead of failing loudly).
    @Test
    void concurrentMergesOfAnExistingLine_neverLoseAnUpdate() throws Exception {
        Long variantId = createVariant("CART-RACE-MERGE", 100);
        Cart cart = cartRepository.saveAndFlush(new Cart());
        cartService.addItem(cart.getId(), new AddCartItemRequest(variantId, 3));

        List<Throwable> failures = runConcurrentAdds(cart.getId(), variantId, 2, 2);

        assertThat(failures).isEmpty();
        CartResponse response = cartService.getCart(cart.getId());
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).quantity()).isEqualTo(7);
    }

    private List<Throwable> runConcurrentAdds(UUID cartId, Long variantId, int quantityEach, int threadCount)
            throws InterruptedException {
        CyclicBarrier barrier = new CyclicBarrier(threadCount);
        List<Throwable> failures = new ArrayList<>();

        try (ExecutorService executor = Executors.newFixedThreadPool(threadCount)) {
            List<Future<Throwable>> futures = new ArrayList<>();
            for (int i = 0; i < threadCount; i++) {
                futures.add(executor.submit(() -> {
                    try {
                        barrier.await(5, TimeUnit.SECONDS);
                        cartService.addItem(cartId, new AddCartItemRequest(variantId, quantityEach));
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

    private static void awaitUninterruptibly(CountDownLatch latch) {
        try {
            latch.await(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
