/**
 * @Author: maple
 * @Date: 2020-11-18 11:43:40
 * @LastEditors: maple
 * @LastEditTime: 2023-01-06 12:04:02
 */

const fs = require('fs');
const path = require('path');
const quickConfig = require('./quick_config');
const { Sequelize, Model } = require('sequelize');

const MODLE_MAP = {};
const DB_MAP = {};
const DB_CONFIG_MAP = {};

function initDB (dbName, initOptions) {
  if (!DB_CONFIG_MAP[dbName]) {
    throw new Error(`db: ${dbName} not init!`);
  }

  const [dbConfig] = DB_CONFIG_MAP[dbName];
  // const db = DB_MAP[dbName] = new T.Toshihiko(dbType, dbConfig);
  const db = new Sequelize(dbConfig.url);

  // add qdefine
  db.qdefine = function (tableName, fields, options) {
    const modelConfig = quickConfig(fields, options);

    class QModel extends Model {

    }

    QModel.init(modelConfig, {
      tableName,
      sequelize: db,
      timestamps: true,
      createdAt: true,
      updatedAt: true,
      freezeTableName: true
    });

    if (initOptions.saveTableWithNoDB) {
      if (!MODLE_MAP[tableName]) {
        // set model map
        MODLE_MAP[tableName] = QModel;
      } else {
        // throw error;
        throw new Error(`model ${tableName} has been already registed!`);
      }
    }

    MODLE_MAP[`${dbName}.${tableName}`] = QModel;
    return QModel;
  };

  return db;
}

function initModel (db, dbName, modelRoot, initOptions) {
  const tableConfigs = [];
  const dbDirPath = path.join(modelRoot, dbName);
  const dirs = fs.readdirSync(dbDirPath);

  // fetch table configs
  for (const file of dirs) {
    // 第一层级
    if (file[0] === '.') continue;
    if (file.indexOf('.js') > -1) {
      const config = require(path.join(dbDirPath, file));
      tableConfigs.push(config);
      continue;
    }

    // 第二层级
    const subRoot = path.join(dbDirPath, file);
    const subDirs = fs.readdirSync(subRoot);
    for (const file of subDirs) {
      if (file[0] === '.') continue;
      if (file.indexOf('.js') > -1) {
        const config = require(path.join(subRoot, file));
        tableConfigs.push(config);
        continue;
      }
    }
  }

  // init model
  for (const config of tableConfigs) {
    if (!config.config) {
      continue;
    }

    let [tableName, fields, options = {}] = config.config;

    if (Array.isArray(fields)) {
      // 数组格式转成 Sequelize 的 object 格式
      fields = quickConfig(fields, options);
    }

    // sequelize 配置
    const sequelizeConfig = options.sequelizeConfig || {};
    const sequelizeSync = options.sequelizeSync === undefined ? true : options.sequelizeSync;
    const sequelizeSyncForce = options.sequelizeSyncForce || false;
    const sequelizeFieldsOptions = options.sequelizeFieldsOptions || {};

    // 添加字段额外信息
    // 支持简配不支持的信息
    for (const key of Object.keys(sequelizeFieldsOptions)) {
      if (!fields[key]) {
        continue;
      }

      const fieldOptions = sequelizeFieldsOptions[key];
      for (const optionsKey of Object.keys(fieldOptions)) {
        fields[key][optionsKey] = fieldOptions[optionsKey];
      }
    }

    class QModel extends Model {

    }

    QModel.init(fields, {
      tableName,
      sequelize: db,
      timestamps: true,
      createdAt: true,
      updatedAt: true,
      freezeTableName: true,
      ...sequelizeConfig
    });

    // 同步数据库
    if (sequelizeSync) {
      QModel.sync({ force: sequelizeSyncForce });
    }

    if (MODLE_MAP[tableName]) {
      throw new Error(`table: ${tableName} already registed!`);
    }

    // set model map
    if (initOptions.saveTableWithNoDB) {
      if (!MODLE_MAP[tableName]) {
        // set model map
        MODLE_MAP[tableName] = QModel;
      } else {
        // throw error;
        throw new Error(`model ${tableName} has been already registed!`);
      }
    }

    if (!MODLE_MAP[tableName]) {
      MODLE_MAP[tableName] = QModel;
    }

    MODLE_MAP[`${dbName}.${tableName}`] = QModel;

    // bind function
    const keys = Object.keys(config).filter(key => key !== 'config');
    for (const key of keys) {
      if (typeof config[key] === 'function') {
        QModel[key] = config[key].bind(QModel);
        continue;
      }

      QModel[key] = config[key];
    }
  }
}

module.exports = {
  db: {
    init: function (dbConfigs = [], modelRoot = '', initOptions = {}) {
      // model 地址
      modelRoot = modelRoot || path.join(process.execPath, 'models');

      if (!Array.isArray(dbConfigs)) {
        dbConfigs = dbConfigs.concat(dbConfigs);
      }

      for (const dbConfig of dbConfigs) {
        const { name } = dbConfig;
        delete dbConfig.name;
        DB_CONFIG_MAP[name] = [dbConfig];
      }

      if (modelRoot) {
        const dbDirs = fs.readdirSync(modelRoot);
        for (const dbDir of dbDirs) {
          if (dbDir[0] === '.') {
            continue;
          }

          const dbName = dbDir;

          // init db
          const db = initDB(dbName, initOptions);

          // init model
          initModel(db, dbName, modelRoot, initOptions);
        }
      }
    },
    get: function (tableName) {
      return DB_MAP[tableName] || null;
    }
  },
  model: {
    get: function (table) {
      const model = MODLE_MAP[table];
      if (!model) {
        throw new Error(`model: ${table} 不存在`);
      }
      return model;
    }
  }
};
