/**
 * @interface
 * @description default http exception response inteface
 */
export interface IValidation {
  statusCode: number;
  message: string[] | string;
}
