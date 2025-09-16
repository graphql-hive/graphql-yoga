import { NextPageProps } from '@theguild/components';
import { generateStaticParamsFor, importPage } from '@theguild/components/pages';
import { useMDXComponents } from '../../mdx-components';
import { Giscus } from '../giscus';

export const generateStaticParams = generateStaticParamsFor('mdxPath');

export async function generateMetadata(props: NextPageProps<'...mdxPath'>) {
  const params = await props.params;
  const { metadata } = await importPage(params.mdxPath);
  return metadata;
}

const Wrapper = useMDXComponents().wrapper;

export default async function Page(props: NextPageProps<'...mdxPath'>) {
  const params = await props.params;
  const result = await importPage(params.mdxPath);
  const { default: MDXContent, toc, metadata } = result;
  return (
    <Wrapper toc={toc} metadata={metadata} bottomContent={<Giscus />}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  );
}
