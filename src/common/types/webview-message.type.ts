export class WebviewMessage {
  text: string;
  command: string;

  constructor(text: string, command: string) {
    this.text = text;
    this.command = command;
  }
}
