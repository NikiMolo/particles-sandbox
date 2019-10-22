import uuid from 'uuid/v4';

export default class UniqueEntity {
  constructor() {
    this.uuid = uuid();
  }
}