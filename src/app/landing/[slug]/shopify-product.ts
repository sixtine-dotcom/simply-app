/**
 * Fetch one product by handle from Shopify Storefront API (server-side).
 */
export async function getShopifyProductByHandle(
  storeDomain: string,
  accessToken: string,
  handle: string
): Promise<{ title: string; descriptionHtml: string; price: string; variantId: string } | null> {
  const url = `https://${storeDomain}.myshopify.com/api/2024-01/graphql.json`;
  const query = `
    query getProduct($handle: String!) {
      product(handle: $handle) {
        title
        descriptionHtml
        variants(first: 1) {
          edges {
            node {
              id
              price {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables: { handle } }),
      next: { revalidate: 60 },
    });
    const data = await res.json();
    if (data.errors || !data.data?.product) return null;
    const product = data.data.product;
    const variant = product.variants?.edges?.[0]?.node;
    if (!variant) return null;
    const variantId = variant.id.replace(/^gid:\/\/shopify\/ProductVariant\//, "");
    const price = variant.price;
    const priceStr =
      (price.currencyCode === "EUR" ? "€" : price.currencyCode + " ") +
      parseFloat(price.amount).toFixed(2);
    return {
      title: product.title,
      descriptionHtml: product.descriptionHtml || "",
      price: priceStr,
      variantId,
    };
  } catch {
    return null;
  }
}
