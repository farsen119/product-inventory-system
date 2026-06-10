import logging


def get_logger(name='products'):
    return logging.getLogger(name)


def log_stock_event(action, sub_variant, quantity, user=None, notes=''):
    logger = logging.getLogger('products.stock')
    logger.info(
        '%s | sub_variant=%s product=%s qty=%s user=%s notes=%s',
        action,
        sub_variant.name,
        sub_variant.product.ProductCode,
        quantity,
        getattr(user, 'username', None),
        notes or '-',
    )


def log_product_event(action, product, user=None, extra=''):
    logger = logging.getLogger('products')
    logger.info(
        '%s | product=%s code=%s user=%s %s',
        action,
        product.ProductName,
        product.ProductCode,
        getattr(user, 'username', None),
        extra,
    )
