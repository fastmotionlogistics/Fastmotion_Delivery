import { MongoError } from 'mongodb';
import { Error } from 'mongoose';

export interface IMongoError extends MongoError {
  driver: string;

  index: number;

  code: number;

  keyPattern: Record<string, any>;

  keyValue: Record<string, any>;

  kind: string;

  errors: Record<string, Error.CastError>;
}

export type IMongooseError = IMongoError & Error.ValidationError;
