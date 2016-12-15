'use strict';

/**
 * Инициализация экземпляра бота:
 *   1. Получение команд для текущего бота;
 *   2. Получение токена для текущего бота;
 *   3. Создание и возвращение экземпляра бота.
 */

/**
 * Module dependencies.
 * @private
 */
const config      = require('../../../config');
const debug       = require('../../../lib/simple-debug')(__filename);
const Bot         = require('../../bot/Bot');
const getCommands = require('./get-commands');
const VKApi       = require('node-vkapi');
const fs          = require('fs');

/**
 * Init function.
 * @param  {Object}  options.auth
 *         @property {String} login Логин
 *         @property {String} phone Телефон
 *         @property {String} pass  Пароль
 * @param  {String}  options.id    ID бота
 * @param  {String}  options._cond Условие добавления
 * @param  {String}  options._name Имя бота
 * @return {Function}
 * @public
 */
function init ({ auth, id, _cond, _name }) {
  /**
   * Callback-функция, которая вернёт (error, result), 
   * где result - экземпляр приложения бота.
   */
  return function (callback) {
    debug.out(`= Creating instance for Bot[id${id}]`);

    /**
     * 1. Получаем список команд для бота
     */
    debug.out('= 1. Getting commands');

    let commands = getCommands({ id });

    /**
     * 2. Получаем токен для бота
     */
    let VKParams = Object.assign({ app: config['vk-app'], auth });
    let VK       = new VKApi(VKParams);
    let tokens;

    debug.out('= 2. Getting token');
    debug.out('= Checking for saved token');

    // Проверяем, есть ли в файле tokens.json токен бота
    if (~fs.readdirSync('./').indexOf('tokens.json')) {
      tokens = require('../../../tokens');

      // Если есть, возвращаем экземпляр
      if (tokens[id]) {
        debug.out('+ Token is exist. Returning the instance');

        return callback(null, new Bot({
          id, 
          commands, 
          condition: _cond, 
          name: _name, 
          token: tokens[id]
        }));
      }
    }

    debug.out('- Token is not exist. Getting a new one');

    // Сохранённого токена нет. Получаем новый
    VK.auth.user({ scope: 'all' })
      .then(tokenObject => {
        // Если были какие-либо сохранённые токены, то добавляем к ним 
        // только что полученный новый. 
        // Если не было, то сохраняем только новый.
        if (tokens) {
          tokens[id] = tokenObject.access_token;
        } else {
          tokens = {
            [id]: tokenObject.access_token
          };
        }

        debug.out('+ Token was got. Saving it now');

        // Сохраняем обновлённый список токенов
        fs.writeFileSync('./tokens.json', JSON.stringify(tokens));

        debug.out('+ Token was saved. Returning the instance');

        // Возвращаем экземпляр
        return callback(null, new Bot({
          id, 
          commands, 
          condition: _cond, 
          name: _name, 
          token: tokens[id]
        }));
      })
      .catch(error => {
        debug.err(`- Error has occurred during creating an instance for Bot[id${id}]`);
        debug.err(error.stack || error);

        return callback(error);
      });
  }
}

module.exports = init;