import { PRODUCTS } from '@theguild/components/products';
import { getDefaultMetadata } from '@theguild/components/server';

export const websiteName = 'Yoga';
export const websiteDescription = PRODUCTS.YOGA.title;

export const rootMetadata = getDefaultMetadata({
  description: websiteDescription,
  websiteName,
  productName: 'YOGA',
});
