import { Injectable } from '@nestjs/common';
import response, { AllResponses } from './message.constant';
import mocks from '../../mocks/message';
import { IErrors } from './message.interface';
import GetResponses from './message.constant';

/**
 * @class
 * @description service to get responses
 * @method get returns message corrensponding to passed param
 */
@Injectable()
export class MessageService {
  private readonly Languages = response();

  get response() {
    return AllResponses;
  }

  get languages() {
    return AllResponses;
  }

  /**
   * @class
   * @description return response
   * @param {key}  string message key using E_RESPONSE package
   */
  get(key: string): string {
    const keys: string[] = key.split('.');

    const languages = AllResponses;

    let selectedMessage = languages[keys[0]];
    if (selectedMessage) {
      for (let i = 1; i < keys.length; i++) {
        selectedMessage = selectedMessage[keys[i]];
        if (!selectedMessage) {
          selectedMessage = key;
          break;
        }
      }
    }
    else selectedMessage = key;

    return selectedMessage as string;
  }

  getRequestErrorsMessage(requestErrors: Record<string, any>[]): IErrors[] {
    const messageErrors: IErrors[] = requestErrors.map((value) => ({
      property: value.property,
      message: this.get(`request.${value.constraints[0]}`)
        .replace('$property', value.property)
        .replace('$value', value.value),
    }));
    return messageErrors;
  }
}

//export response by language key

/**
 * @description {object} response constants
 */

export const E_RESPONSE = mocks;
