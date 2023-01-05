/*
 * @Author: maple
 * @Date: 2020-11-18 15:47:50
 * @LastEditors: maple
 * @LastEditTime: 2023-01-05 17:11:45
 */
import { Sequelize, Model } from 'sequelize';


declare class SequelizeQ extends Sequelize {
  qdefine(collectionName: string, schema: any[], options?: any): Model;
}

interface QDB {
  get(name: string): SequelizeQ;
  init(dbConfigs: any[], modelRoot: string): void;
}

interface QModel {
  get(tableName: string): typeof Model;
}

declare const db: QDB;

declare const model: QModel;