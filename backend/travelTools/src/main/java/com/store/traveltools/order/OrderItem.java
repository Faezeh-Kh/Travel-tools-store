package com.store.traveltools.order;

import java.math.BigDecimal;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    // Plain ids, not @ManyToOne associations: everything an order item shows is copied at purchase time,
    // so nothing should ever be read through the catalog entities (whose name/price may have changed).
    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "product_variant_id", nullable = false)
    private Long productVariantId;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(name = "variant_description", nullable = false)
    private String variantDescription;

    // Optional: the product's primary image path at purchase time (products may have no image).
    @Column(name = "product_image")
    private String productImage;

    @Column(nullable = false)
    private String sku;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "total_price", nullable = false)
    private BigDecimal totalPrice;

    protected OrderItem() {
    }

    // Package-private: only checkout (in this package) creates order items. The line total is derived
    // here so it always equals unitPrice * quantity (also enforced by a CHECK constraint in V6). The
    // quantity/price checks duplicate V6's CHECK constraints so an invalid item fails here, at
    // construction, rather than only later at flush time.
    OrderItem(Long productId, Long productVariantId, String productName, String variantDescription,
            String productImage, String sku, Integer quantity, BigDecimal unitPrice) {
        if (quantity == null || quantity < 1) {
            throw new IllegalArgumentException("Order item quantity must be positive: " + quantity);
        }
        if (unitPrice == null || unitPrice.signum() < 0) {
            throw new IllegalArgumentException("Order item unit price must not be negative: " + unitPrice);
        }
        this.productId = Objects.requireNonNull(productId, "productId");
        this.productVariantId = Objects.requireNonNull(productVariantId, "productVariantId");
        this.productName = Objects.requireNonNull(productName, "productName");
        this.variantDescription = Objects.requireNonNull(variantDescription, "variantDescription");
        this.productImage = productImage;
        this.sku = Objects.requireNonNull(sku, "sku");
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.totalPrice = unitPrice.multiply(BigDecimal.valueOf(quantity));
    }

    void setOrder(Order order) {
        this.order = order;
    }

    public Long getId() {
        return id;
    }

    public Order getOrder() {
        return order;
    }

    public Long getProductId() {
        return productId;
    }

    public Long getProductVariantId() {
        return productVariantId;
    }

    public String getProductName() {
        return productName;
    }

    public String getVariantDescription() {
        return variantDescription;
    }

    public String getProductImage() {
        return productImage;
    }

    public String getSku() {
        return sku;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public BigDecimal getTotalPrice() {
        return totalPrice;
    }
}
