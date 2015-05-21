
var extend = require('extend');
var redis = require('redis-url');
var async = require('async');

var defaultOptions = {
  prefix: 'online',   // redis keys prefix
  interval: 3         // minutes (user is offline after the time)
};

function onlineTracker(){
  this.options = {};
}

onlineTracker.prototype.init = function(options){
  this.options = extend(true, defaultOptions, options);
  this.options.redisUrl = this.options.redisUrl || process.env.REDIS_URL;

  if (this.options.redisUrl){
    this.client = redis.connect(this.options.redisUrl);
    this._init = true;
  }
};

onlineTracker.prototype.setOnline = function(userId, cb){
  if(!this._init) this.init();
  if (!this.client) return cb && cb('No redis connection!');

  var key = this.getTimeKey();

  async.parallel([
    this.client.sadd.bind(this.client, key, userId),
    this.client.expire.bind(this.client, key, 15 * 60)
  ], cb);

};

onlineTracker.prototype.getOnline = function(time, cb){

  if (!cb){
    cb = time;
    time = this.options.interval;
  }

  if(!this._init) this.init();
  if (!this.client) return cb && cb('No redis connection!');
  var keys = this.getTimeKeys(time);
  this.client.sunion(keys, cb);
};

onlineTracker.prototype.isOnline = function(userId, cb){
  if(!this._init) this.init();
  if (!this.client) return cb && cb('No redis connection!');

  this.getOnline(function(err, res){
    if(err) return cb && cb(err);

    res = res || [];

    cb && cb(null, res.indexOf(userId) >= 0);
  })
};

// redis sets key
// format - prefix:hh:mm
onlineTracker.prototype.getTimeKey = function(){
  var date = new Date(),
    hh = zerify(date.getHours()),
    mm = zerify(date.getMinutes());

  return this.options.prefix + ':' +  hh + ':' + mm;
};

onlineTracker.prototype.getTimeKeys = function(time){
  var date = new Date(), hh, mm, keys= [];


  for(var i = 0; i < time; i++){

    hh = zerify(date.getHours());
    mm = zerify(date.getMinutes());

    keys.push(this.options.prefix + ':' + hh + ':' + mm);

    date.setMinutes(date.getMinutes() - 1)
  }

  return keys;
};

function zerify(str){
  return ('00' + str).slice(-2);
}

module.exports = new onlineTracker();
