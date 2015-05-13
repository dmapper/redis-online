
var extend = require('extend');
var redis = require('redis-url');
var async = require('async');

var defaultOptions = {
  prefix: 'online',   // redis keys prefix
  interval: 3         // minutes (user is offline after the time)
};

function onlineTracker(options){
  this.options = extend(true, defaultOptions, options);
  this.options.redisUrl = this.options.redisUrl || process.env.REDIS_URL;

  if (this.options.redisUrl){
    this.client = redis.connect(this.options.redisUrl);
  }
}

onlineTracker.prototype.setOnline = function(userId, cb){
  if (!this.client) return cb && cb('No redis connection!');

  var key = this.getTimeKey();

  console.log({key: key});

  async.parallel([
    this.client.sadd.bind(this.client, key, userId),
    this.client.expire.bind(this.client, key, this.options.interval * 60)
  ], cb);

};

onlineTracker.prototype.getOnline = function(cb){
  if (!this.client) return cb && cb('No redis connection!');

  var keys = this.getTimeKeys();
  console.log({keys: keys});
  this.client.sunion(keys, cb);
};

onlineTracker.prototype.isOnline = function(userId, cb){
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

onlineTracker.prototype.getTimeKeys = function(){
  var date = new Date(), hh, mm, keys= [];


  for(var i = 0; i < this.options.interval; i++){

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

module.exports = function (options) {
  return new onlineTracker(options);
};