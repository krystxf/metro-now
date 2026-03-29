type AnyFunction = (...args: never[]) => unknown;

export type ParentType<T extends AnyFunction> = NonNullable<
    Awaited<ReturnType<T>> extends Array<infer U> ? U : Awaited<ReturnType<T>>
>;
