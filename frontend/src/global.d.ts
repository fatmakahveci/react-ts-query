declare module '*.module.css' {
    const classes: { readonly [key: string]: string };
    export default classes;
}

declare module "*.jpg" {
    const value: any;
    export default value;
  }
  