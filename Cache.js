var Q = require("q");
var NonDeterministicEventEmitter = require("non-deterministic");
require("util").inherits(Cache,NonDeterministicEventEmitter);
function Cache(defaults)  {
  this._data = new Map();
  //this._defaults = defaults||
  this.on("any",(args,name) => {
    console.log(name,"has been emitted",args[0]._key);
  })
  /*this.on("beforeRelease",(entity) => 
      console.log("RELEASE:",entity._key,"LIFE:",entity._life));*/
};
Cache.prototype.get = function(key,options)  {
  var entry = this._data.get(key);
  console.log("getting",key);
  if(entry) {
    return Q(entry);
  }
  entry = new this._entity(key,this,options)
  this._data.set(key , entry);
  return Q(entry);
};
Cache.prototype.set = function(key,value)  {
  return this.get(key).set(value);
};
Cache.prototype.create = function(key,data) {
  return new this._entity(key,this)._create(data);
};
Cache.prototype.release = function(key)  {
  return this.get(key).release();
};

Cache.prototype.onAny = function(f)  {
};
module.exports = Cache;
