export type ActionResult<TData = undefined, TFieldErrors = Record<string, string[]>> =
  | {
      ok: true;
      data: TData;
      message: string;
    }
  | {
      ok: false;
      fieldErrors?: TFieldErrors;
      message: string;
    };
