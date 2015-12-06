var stream = require("stream");
var NonDeterministicEventEmitter = require("non-deterministic");
var choicePoint = NonDeterministicEventEmitter.choicePoint;
var inherits    = require("util").inherits   ;
var Q = require("q");
/**
 * A generic interface to future values.
 *
 * Entities are subclassable, they 
 * can't do anything with out being used as a
 * super class of a more specific type
 *
 * All entities must implement the following methods:
 * _get
 * _set
 * _check
 * _create
 * _destroy
 * _move
 *
 * @class
 * @param key
 * @param options
 */
inherits(Entity,NonDeterministicEventEmitter);
function Entity(key,options) {
  //all methods on an entity return a promise, and most emit an event
  //
  var entity = this._cache._data.get(key);
  if( entity instanceof this.constructor) {
    return entity;
  }
  if(typeof options !== "object") {
    options = {
      check:true,
      create:false,
      keep:false
    };
  }
  if(options.create)  {
    this._data = options.data;
    this._create(options.data);
  }
  this._readyState = "pending";
  if(typeof options.check != "undefined" && options.check) {
    //the check option will emit a ready event
    this._check()
      .then((v) => {
        this.emit("ready",v)
      })
      .catch((e) => this.emit("checkfail",e))
  } else {
    //if there will be no check, then we must emit the ready
    //event our selves
    this.emit("ready");

  }
  this._key       = key;
  this._options   = options;
  this._life = 10;
  this
    .on("ready",() => {
      this._readyState = "ready";
      this._cache._data.set(key,this)
    })
    .on("checkfail",(e) => {
      this._readyState = "failed";
      this._reason = e;
      this.emit("error",e)
    })
    .on("any",(args,name) => {
      this._cache.emit(name,this,...args);
    })
    .on("error",(e) =>
        this._release());
  if(options.keep)  {
    this
      .on("beforeGetData",() => 
          this._extendLife(this._life))
      .on("afterGetData",(data) => 
          this._extendLife(this._life/data.length))
      .on("beforeSetData",(data) => 
          this._extendLife(this._life/data.length))
      .on("afterSetData",() => 
          this._extendLife(this._life))
      .on("beforeCreate",(data) =>
          this.extendLife(this._life*2/data.length))
      .on("afterCreate",() =>
          this.extendLife(this._life))
  }
};
choicePoint(Entity,"getData",(force) =>{
  if(this._data && !force)  {
    return Q(this._data);
  } else {
    throw new Error("entry not in cache");
  }
});
Entity.prototype._getData = function(force) {
  this.emit("beforeGetData");
  return this._getData().then((data)  => {
    this.emit("afterGetData",data);
    return data;
  })
};
Entity.prototype.getChild = function(name)  {
  //this function is assumeing that _data is a Map
  var child = this._data.get(name);
  if(child)  {
    return child;
  }
  this.emit("beforeGetChild",name);
  return this._getChild(name)
    .then((child) => {
      this.emit("afterGetChild",child);
      return child;
    });

};
Entity.prototype.setData = function(value,options) {
  this.emit("beforeSetData",value,this);
  return this._setData(value)
    .then(() =>
        this.emit('afterSetData',value,this));
};
Entity.prototype.setChild = function(name,value)  {
  this.emit("beforeSetChild",value,this);
  return this._setChild(name,value)
    .then(() =>
        this.emit('afterSetChild',value,this));
};
Entity.prototype.setStream = function(options) {
  var stream = this._setStream(options)
  this.emit("beforeSetStream",stream);
  return stream
    .on("end",() =>
        this.emit("afterSetStream",stream));
};
Entity.prototype.getStream = function(options) {
  this.emit("beforeGetStream",stream);
  var stream = this._getStream(options)
  return stream
    .on("end",() =>
        this.emit("afterGetStream",stream));
};
Entity.prototype.release = function() {
  this.emit("beforeRelease");
  console.log("releasing",this._key,this._life);
  return this._release().then(() =>this.emit("afterRelease"));
};
Entity.prototype.execute = function(context) {
  this.emit("beforeExecute");
  var obj = this;
  return this._execute(context)
    .then((result) => {
      this.emit("afterExecute",result);
      return result;
    })
    .catch(err => {
      obj = Object
        .getPrototypeOf(obj)
      if(Entity.prototype.isPrototypeOf(obj)) {
        return obj["_"+name]
      }
    })
};
Entity.prototype.create = function(data)  {
};
Entity.prototype.scan = function(f) {
  this.emit("beforeScan");
  return this._scan(f)
    .then((result) => {
      this.emit("afterScan");
      return result;
    });
};
Entity.prototype._extendLife = function(modifier) {
  this.emit("extendLife");
  console.log
    ("extending life of",this.path,
      "from",this._life,
      "by",modifier)
  this._life = this._life+modifier;
  clearTimeout(this._timer);
  this._timer = setTimeout(() => this.release(),this._life);
};
//methods with an underscore are required to be implemented in a subclass to use
//the non-scored version of the method. The default action is to throw an error
//if there is no other method available.
Entity.prototype._setChild = function() {
  return Q.reject(new Error("_setChild method not implemented on this Entity"));
};
Entity.prototype._getChild = function() {
  return Q.reject(new Error("_getChild method not implemented by this entity"));
};
Entity.prototype._getData = function()  {
  return Q.reject(new Error("_getData not implemented by this entity"));
};
Entity.prototype._setData = function()  {
  return Q.reject(new Error("_setData not implemented by this entity"));
};
Entity.prototype._getStream = function() {
  return Q.reject(new Error("_getStream not implemented by this entity"));
};
Entity.prototype._setStream = function() {
  return Q.reject(new Error("_setStream not implemented by this entity"));
};
Entity.prototype._create = function()  {
  return Q.reject(new Error("_create not implemented by this entity"));
};
Entity.prototype._move = function()  {
  return Q.reject(new Error("_move not implemented by this entity"));
};
Entity.prototype._destroy = function()  {
  return Q.reject(new Error("_destroy not implemented by this entity"));
};
Entity.prototype._check = function()  {
  return Q.reject(new Error("_check not implemented by this entity"));
};
Entity.prototype._scan = function() {
  return Q.reject(new Error("_scan not implemented by this entity"));
};
Entity.prototype._map = function() {
  return Q.reject(new Error("_map not implemented by this entity"));
};

Entity.prototype._release = function()  {
  //return Q.reject(new Error("_release not implemented by this entity"));
  return Q(this._cache._data.delete(this._key));
};
Entity.prototype._execute = function()  {
  return Q.reject(new Error("_execute not implemented by this entity"));
};
module.exports = Entity;
