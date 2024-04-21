import { MDXComponents } from "mdx/types";

const useMDXComponents = (components: MDXComponents): MDXComponents => {
  return {
    ...components,
  };
};

export { useMDXComponents };
