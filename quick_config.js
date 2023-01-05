
const { DataTypes } = require('sequelize');

const chars = 'abcdefghijklmnopgrstuvwxyz'.split('');
const charMap = {};
const lowerCharMap = {};
for (const c of chars) {
  charMap[c.toUpperCase()] = c;
  lowerCharMap[c] = c;
}

function getLowerName (name = '') {
  let result = '';
  for (let i = 0; i < name.length; i++) {
    const c = name[i];
    const lastC = name[i - 1];
    const nextC = name[i + 1];
    if (charMap[c] && (lowerCharMap[lastC] ||
             ((charMap[lastC]) && lowerCharMap[nextC]))) {
      result += '_';
      result += charMap[c];
      continue;
    }
    result += c.toLowerCase();
  }

  return result;
}

const quickConfig = function (items = [], options = {}) {
  const configs = [];

  const { setPrimaryKey = true } = options;

  let primaryKeySet = !setPrimaryKey;

  for (let item of items) {
    if (typeof item === 'string') {
      item = item.split(',').map(item => item.trim());
    }

    const config = {};

    // 设置 primary key
    if (!primaryKeySet) {
      config.primaryKey = true;
      config.allowNull = true;
      primaryKeySet = true;
    }

    // 全局 allowNull
    if (options.allowNull) {
      if (!config.primaryKey) {
        config.allowNull = true;
      }
    }

    // 匹配 Name 和 field
    // name 最后需要额外处理下
    const name = item.shift();

    if (typeof name === 'string') {
      const lowerName = getLowerName(name);

      if (lowerName !== name) {
        config.field = lowerName;
      }
      config.name = name;
    } else if (Array.isArray(name) && name.length) {
      config.name = name[0];
      config.field = name[1] || undefined;
    }

    if (item.length === 0) {
      configs.push(config);
      continue;
    }

    // 匹配 type
    let type = item.shift();

    if (typeof type === 'string') {
      let size = null;
      if (type.indexOf('=') > -1) {
        [type, size] = type.split('=');
        if (!isNaN(parseInt(size)) && parseInt(size) > 0) {
          size = parseInt(size);
        }
      }

      if (type === 's') {
        type = DataTypes.STRING;
      } else if (type === 'sb') {
        type = DataTypes.STRING.BINARY;
      } else if (type === 't') {
        type = DataTypes.TEXT;
      } else if (type === 'ct') {
        type = DataTypes.CITEXT;
      } else if (type === 'ts') {
        type = DataTypes.TSVECTOR;
      } else if (type === 'i') {
        type = DataTypes.INTEGER;
      } else if (type === 'bi') {
        type = DataTypes.BIGINT;
      } else if (type === 'r') {
        type = DataTypes.REAL;
      } else if (type === 'd') {
        type = DataTypes.DOUBLE;
      } else if (type === 'de') {
        type = DataTypes.DECIMAL;
      } else if (type === 'bi') {
        type = DataTypes.BIGINT;
      } else if (type === 'f') {
        type = DataTypes.FLOAT;
      } else if (type === 'd') {
        type = DataTypes.DATE;
      } else if (type === 'b') {
        type = DataTypes.BOOLEAN;
      } else if (type === 'u') {
        type = DataTypes.UUID;
      }

      if (size !== null) {
        type = type(size);
      }

      config.type = type;
      if (config.type === DataTypes.UUID) {
        config.defaultValue = DataTypes.UUIDV4;
      }
    } else if (type) {
      config.type = type;
    }

    if (item.length === 0) {
      configs.push(config);
      continue;
    }

    let allowNull = item.shift();
    let defaultValue;

    // 判定 Boolean 下 true 为默认值优先
    if (type === 'Boolean' && (
      typeof allowNull === 'boolean' ||
      allowNull === 'true' ||
      allowNull === 'false'
    )) {
      allowNull = allowNull ? (allowNull !== 'false') : false;
      config.defaultValue = defaultValue = allowNull;
    } else {
      if (allowNull === '$t' || allowNull === 'true' || allowNull === true) {
        config.allowNull = allowNull = true;
      } else if (allowNull === '$f' || allowNull === false || allowNull === false) {
        config.allowNull = allowNull = false;
      } else {
        config.defaultValue = defaultValue = allowNull;
      }
    }

    if (defaultValue === undefined) {
      defaultValue = item.shift();
    }

    if (typeof defaultValue === 'object' && defaultValue !== null) {
      item.unshift(defaultValue);
    } else if (defaultValue !== undefined) {
      // 根据类型，对 defaultValue 做转换
      // TODO 类型转换
      config.defaultValue = defaultValue;
    }

    if (item.length === 0) {
      configs.push(config);
      continue;
    }

    const otherConfig = item.shift();
    if (typeof otherConfig === 'object') {
      Object.assign(config, otherConfig);
    }

    configs.push(config);
  }

  const config = {};
  for (const c of configs) {
    const name = c.name;
    delete c.name;
    config[name] = c;
  }

  return config;
};

module.exports = quickConfig;
