export type success = true;
export type error<T extends string> = T;

export const expect = <_ extends success>() => {};
export const expectError = <_ extends error<string>>() => {};
export const expectType = <T>(_: T) => {};

export type typesEqual<T, U> = [T] extends [U]
  ? [U] extends [T]
    ? true
    : "Types not equal"
  : "Types not equal";
export type typesAssignable<T, U> = U extends T
  ? true
  : "U is not assignable to T";
