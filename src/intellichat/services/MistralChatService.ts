import { IChatContext } from 'intellichat/types';
import OpenAIChatService from './OpenAIChatService';
import Mistral from '../../providers/Mistral';
import INextChatService from './INextCharService';

export default class MistralChatService
  extends OpenAIChatService
  implements INextChatService
{
  constructor(name:string, chatContext: IChatContext) {
    super(name, chatContext);
    this.provider = Mistral;
  }

}
