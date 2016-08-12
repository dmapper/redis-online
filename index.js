
var extend = require('extend');
var redis = require('redis-url');
var async = require('async');

var defaultOptions = {
  prefix: 'online',   // redis keys prefix
  interval: 180,        // seconds (user is offline after the time)
  expireTime: 60 * 60 // seconds for data to expire in redis
};

function onlineTracker(){
  this.options = {};
}

onlineTracker.prototype.init = function(options){
  options = options || {};
  this.options = extend(true, defaultOptions, options);
  this.options.redisUrl = this.options.redisUrl || process.env.REDIS_URL;

  if (this.options.redisUrl){
    this.client = redis.connect(this.options.redisUrl);
    this._init = true;
  }
};

onlineTracker.prototype.setOnline = function(userId, prefix, cb){
  if (!cb){
    cb = prefix;
    prefix = this.options.prefix;
  }

  if(!this._init) this.init();
  if (!this.client) return cb && cb('No redis connection!');

  var key = this.getTimeKey(prefix);

  async.parallel([
    this.client.sadd.bind(this.client, key, userId),
    this.client.expire.bind(this.client, key, this.options.expireTime)
  ], cb);

};

onlineTracker.prototype.getOnline = function(time, prefix, cb){

  if (!prefix) {
    cb = time;
    time = this.options.interval;
    prefix = this.options.prefix;
  }
  if (!cb){
    cb = prefix;
    prefix = time;
    time = this.options.interval;
  }

  if(!this._init) this.init();
  if (!this.client) return cb && cb('No redis connection!');
  var keys = this.getTimeKeys(time, prefix);
  this.client.sunion(keys, cb);
};

onlineTracker.prototype.isOnline = function(userId, prefix, cb){
  if (!cb){
    cb = prefix;
    prefix = this.options.prefix;
  }
  if(!this._init) this.init({});
  if (!this.client) return cb && cb('No redis connection!');

  this.getOnline(prefix, function(err, res){
    if(err) return cb && cb(err);

    res = res || [];

    cb && cb(null, res.indexOf(userId) >= 0);
  })
};

// redis sets key
// format - prefix:hh:mm
onlineTracker.prototype.getTimeKey = function(prefix){
  prefix = prefix || this.options.prefix;
  var date = new Date();
  var hh = zerify(date.getHours());
  var mm = zerify(date.getMinutes());
  var ss = zerify(round(date.getSeconds(), this.options.round || 5));
  return prefix + ':' +  hh + ':' + mm + ':' + ss;
};

onlineTracker.prototype.getTimeKeys = function(time, prefix){
  var timestamp = Date.now(), hh, mm, ss, keys= [];
  var rnd = this.options.round || 5;

  for(var i = 0; i < Math.ceil(time / rnd); i++){
    var date = new Date(timestamp - i * rnd * 1000);

    hh = zerify(date.getHours());
    mm = zerify(date.getMinutes());
    ss = zerify(round(date.getSeconds(), rnd));

    keys.push(prefix + ':' + hh + ':' + mm + ':' + ss);

  }

  return keys;
};

function zerify(str){
  return ('00' + str).slice(-2);
}

function round(num, div){
  return Math.floor(num / div) * div;
}

module.exports = new onlineTracker();
