/*
* Tween by Grant Skinner. Mar 7, 2011
* Visit http://easeljs.com/ for documentation, updates and examples.
*
*
* Copyright (c) 2010 Grant Skinner
* 
* Permission is hereby granted, free of charge, to any person
* obtaining a copy of this software and associated documentation
* files (the "Software"), to deal in the Software without
* restriction, including without limitation the rights to use,
* copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the
* Software is furnished to do so, subject to the following
* conditions:
* 
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
* OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
* NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
* HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
* WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
* FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
* OTHER DEALINGS IN THE SOFTWARE.
*/

/**
* The TweenJS Javascript library provides a simple but powerful tweening interface. It allows you to chain tweens and
 * actions together to create complex sequences. For example:<br/>
 * Tween.get(target).wait(500).to({alpha:0,visible:false},1000).call(onComplete);<br/>
 * This tween will wait 0.5s, tween the target's alpha property to 0 over 1s, set it's visible to false, then call the onComplete function.
* @module TweenJS
**/

// TODO: possibly add a END actionsMode (only runs actions that == position)?
// TODO: evaluate a way to decouple paused from tick registration.
(function(window) {
/**
 * Returns a new Tween instance. See Tween.get for param documentation.
* @class Tween
* @constructor
**/
var Tween = function(target, props) {
  this.initialize(target, props);
}
var p = Tween.prototype;

// static interface:
	/** 
	 * Constant defining the none actionsMode for use with setPosition.
	 * @property NONE
	 * @type Number
	 * @static
	 **/
	Tween.NONE = 0;
	
	/** 
	 * Constant defining the loop actionsMode for use with setPosition.
	 * @property LOOP
	 * @type Number
	 * @static
	 **/
	Tween.LOOP = 1;
	
	/** 
	 * Constant defining the reverse actionsMode for use with setPosition.
	 * @property REVERSE
	 * @type Number
	 * @static
	 **/
	Tween.REVERSE = 2;

	/**
	 * Constant returned by plugins to tell the tween not to use default assignment.
	 * @property IGNORE
	 * @type Object
	 * @static
	 */
	Tween.IGNORE = {};
	
	/** 
	 * @property _listeners
	 * @type Array[Tween]
	 * @static
	 * @protected 
	 **/
	Tween._tweens = [];
	
	/** 
	 * @property _plugins
	 * @type Object
	 * @static
	 * @protected 
	 **/
	Tween._plugins = {};

	/**
	 * Returns a new tween instance. This is functionally identical to using "new Tween(...)", but looks cleaner
	 * with the chained syntax of TweenJS.
	 * @method get
	 * @static
	 * @param target The target object that will have its properties tweened.
	 * @param props The configuration properties to apply to this tween instance (ex. {loop:true, paused:true}). All properties default to false. Supported props are:<UL>
	 *    <LI> loop: sets the loop property on this tween.</LI>
	 *    <LI> useTicks: uses ticks for all durations instead of milliseconds.</LI>
	 *    <LI> ignoreGlobalPause: sets the ignoreGlobalPause property on this tween.</LI>
	 *    <LI> override: if true, Tween.removeTweens(target) will be called to remove any other tweens with the same target.
	 *    <LI> paused: indicates whether to start the tween paused.</LI>
	 *    <LI> position: indicates the initial position for this timeline</LI>
	 * </UL>
	 **/
	Tween.get = function(target, props) {
		return new Tween(target, props);
	}
	
	/**
	 * Advances all tweens. This typically uses the Ticker class (when available), but you can call it manually if you prefer to use
	 * your own "heartbeat" implementation.
	 * @method tick
	 * @static
	 * @param delta The change in time in milliseconds since the last tick. Required unless all tweens have useTicks set to true.
	 * @param paused Indicates whether a global pause is in effect. Tweens with ignoreGlobalPause will ignore this, but all others will pause if this is true.
	 **/
	Tween.tick = function(delta, paused) {
		var tweens = Tween._tweens;
		for (var i=tweens.length-1; i>=0; i--) {
			var tween = tweens[i];
			if (paused && !tween.ignoreGlobalPause) { continue; }
			tween.tick(tween._useTicks?1:delta);
		}
	}
	if (Ticker) { Ticker.addListener(Tween,false); }
	
	
	/** 
	 * Removes all existing tweens for a target. This is called automatically by new tweens if the "override" prop is true.
	 * @method removeTweens
	 * @static
	 * @param target The target object to remove existing tweens from.
	 **/
	Tween.removeTweens = function(target) {
		if (!target.tweenjs_count) { return; }
		var tweens = Tween._tweens;
		for (var i=tweens.length-1; i>=0; i--) {
			if (tweens[i]._target == target) { tweens.splice(i,1); }
		}
		target.tweenjs_count = 0;
	}
	
	/** 
	 * TODO: doc.
	 * @method installPlugin
	 * @static
	 * @param plugin
	 * @param properties
	 **/
	Tween.installPlugin = function(plugin, properties) {
		var priority = plugin.priority;
		if (priority == null) { plugin.priority = priority = 0; }
		for (var i=0,l=properties.length,p=Tween._plugins;i<l;i++) {
			var n = properties[i];
			if (!p[n]) { p[n] = [plugin]; }
			else {
				var arr = p[n];
				for (var j=0,jl=arr.length;j<jl;j++) {
					if (priority < arr[j].priority) { break; }
				}
				p[n].splice(j,0,plugin);
			}
		}
	}
	
	/** 
	 * Registers or unregisters a tween with the ticking system.
	 * @method _register
	 * @static
	 * @protected 
	 **/
	Tween._register = function(tween, value) {
		var target = tween._target;
		if (value) {
			if (target) { target.tweenjs_count = target.tweenjs_count ? target.tweenjs_count+1 : 1; }
			Tween._tweens.push(tween);
		} else {
			if (target) { target.tweenjs_count--; }
			var i = Tween._tweens.indexOf(tween);
			if (i != -1) { Tween._tweens.splice(i,1); }
		}
	}

// public properties:
	/**
	 * Causes this tween to continue playing when a global pause is active. For example, if TweenJS is using Ticker,
	 * then setting this to true (the default) will cause this tween to be paused when Ticker.setPaused(true) is called.
	 * See Tween.tick() for more info. Can be set via the props param.
	 * @property ignoreGlobalPause
	 * @type Boolean
	 **/
	p.ignoreGlobalPause = false;
	
	/**
	 * If true, the tween will loop when it reaches the end. Can be set via the props param.
	 * @property loop
	 * @type Boolean
	 **/
	p.loop = false;
	
	/**
	 * Read-only property specifying the total duration of this tween in milliseconds (or ticks if useTicks is true).
	 * This value is automatically updated as you modify the tween.
	 * @property duration
	 * @type Number
	 **/
	p.duration = 0;
	
	
	/**
	 * Allows you to specify data that will be used by installed plugins. Each plugin uses this differently, but in general
	 * you specify data by setting it to a property of pluginData with the same name as the plugin class.<br/>
	 * Ex. myTween.pluginData.PluginClassName = data;<br/>
	 * <br/>
	 * Also, most plugins support a property to enable or disable them. This is typically the plugin class name followed by "_enabled".<br/>
	 * Ex. myTween.pluginData.PluginClassName_enabled = false;<br/>
	 * <br/>
	 * Some plugins also store instance data in this object, usually in a property named _PluginClassName.
	 * See the documentation for individual plugins for more details.
	 * @property pluginData
	 * @type Object
	 **/
	p.pluginData = null;

// private properties:
	
	/**
	 * @property _paused
	 * @type Boolean
	 * @protected
	 **/
	p._paused = false;
	
	/**
	 * @property _curQueueProps
	 * @type Object
	 * @protected
	 **/
	p._curQueueProps = null;
	
	/**
	 * @property _initQueueProps
	 * @type Object
	 * @protected
	 **/
	p._initQueueProps = null;
	
	/**
	 * @property _steps
	 * @type Array
	 * @protected
	 **/
	p._steps = null;
	
	/**
	 * @property _actions
	 * @type Array
	 * @protected
	 **/
	p._actions = null;
	
	/**
	 * Raw position.
	 * @property _prevPosition
	 * @type Number
	 * @protected
	 **/
	p._prevPosition = 0;

	/**
	 * The position within the current step.
	 * @property _stepPosition
	 * @type Number
	 * @protected
	 */
	p._stepPosition = 0;
	
	/**
	 * Normalized position.
	 * @property _prevPos
	 * @type Number
	 * @protected
	 **/
	p._prevPos = -1;
	
	/**
	 * @property _prevIndex
	 * @type Number
	 * @protected
	 **/
	p._prevIndex = -1;
	
	/**
	 * @property _target
	 * @type Object
	 * @protected
	 **/
	p._target = null;
	
	/**
	 * @property _useTicks
	 * @type Boolean
	 * @protected
	 **/
	p._useTicks = false;
	
// constructor:
	/** 
	 * @method initialize
	 * @protected
	 **/
	p.initialize = function(target, props, pluginData) {
		this._target = target;
		if (props) {
			this._useTicks = props.useTicks;
			this.ignoreGlobalPause = props.ignoreGlobalPause;
			this.loop = props.loop;
			if (props.override) { Tween.removeTweens(target); }
		}
		
		this.pluginData = pluginData || {};
		this._curQueueProps = {};
		this._initQueueProps = {};
		this._steps = [];
		this._actions = [];
		this._catalog = [];
		if (!props||!props.paused) { Tween._register(this,true); }
		if (props&&props.position!=null) { this.setPosition(props.position, Tween.NONE); }
	}
	
// public methods:
	/** 
	 * Queues a wait (essentially an empty tween).
	 * @method wait
	 * @param duration The duration of the wait in milliseconds (or in ticks if useTicks is true).
	 * @return Tween This tween instance (for chaining calls).
	 **/
	p.wait = function(duration) {
		if (duration == null || duration <= 0) { return this; }
		var o = this._cloneProps(this._curQueueProps);
		return this._addStep({d:duration, p0:o, e:this._linearEase, p1:o});
	}

	/** 
	 * Queues a tween from the current values to the target properties. Set duration to 0 to jump to these value.
	 * Numeric properties will be tweened from their current value in the tween to the target value. Non-numeric
	 * properties will be set at the end of the specified duration.
	 * @method to
	 * @param props An object specifying property target values for this tween (Ex. {x:300} would tween the x property of the target to 300).
	 * @param duration The duration of the wait in milliseconds (or in ticks if useTicks is true).
	 * @param ease The easing function to use for this tween.
	 * @return Tween This tween instance (for chaining calls).
	 **/
	p.to = function(props, duration, ease) {
		if (isNaN(duration) || duration < 0) { duration = 0; }
		return this._addStep({d:duration||0, p0:this._cloneProps(this._curQueueProps), e:ease, p1:this._cloneProps(this._appendQueueProps(props))});
	}
	
	/** 
	 * Queues an action to call the specified function. For example: myTween.wait(1000).call(myFunction); would call myFunction() after 1s.
	 * @method call
	 * @param callback The function to call.
	 * @param params The parameters to call the function with. If this is omitted, then the function will be called with a single param pointing to this tween.
	 * @param scope The scope to call the function in. If omitted, it will be called in the target's scope.
	 * @return Tween This tween instance (for chaining calls).
	 **/
	p.call = function(callback, params, scope) {
		return this._addAction({f:callback, p:params ? params : [this], o:scope ? scope : this._target});
	}
	
	/** 
	 * Queues an action to set the specified props on the specified target. If target is null, it will use this tween's target. Ex. myTween.wait(1000).set({visible:false},foo);
	 * @method set
	 * @param props The properties to set (ex. {visible:false}).
	 * @param target The target to set the properties on. If omitted, they will be set on the tween's target.
	 * @return Tween This tween instance (for chaining calls).
	 **/
	p.set = function(props, target) {
		return this._addAction({f:this._set, o:this, p:[props, target ? target : this._target]});
	}
	
	/** 
	 * Queues an action to to play (unpause) the specified tween. This enables you to sequence multiple tweens. Ex. myTween.to({x:100},500).play(otherTween);
	 * @method play
	 * @param tween The tween to play.
	 * @return Tween This tween instance (for chaining calls).
	 **/
	p.play = function(tween) {
		return this.call(tween.setPaused, [false], tween);
	}

	/** 
	 * Queues an action to to pause the specified tween.
	 * @method pause
	 * @param tween The tween to play. If null, it pauses this tween.
	 **/
	p.pause = function(tween) {
		if (!tween) { tween = this; }
		return this.call(tween.setPaused, [true], tween);
	}
	
	/** 
	 * Advances the tween to a specified position.
	 * @method setPosition
	 * @param value The position to seek to in milliseconds (or ticks if useTicks is true).
	 * @param actionsMode Optional parameter specifying how actions are handled (ie. call, set, play, pause): Tween.NONE (0) - run no actions. Tween.LOOP (1) - if new position is less than old, then run all actions between old and duration, then all actions between 0 and new. Defaults to LOOP. Tween.REVERSE (2) - if new position is less than old, run all actions between them in reverse. 
	 * @return Boolean Returns true if the tween is complete (ie. the full tween has run & loop is false).
	 **/
	p.setPosition = function(value, actionsMode) {
		if (actionsMode == null) { actionsMode = 1; }
		
		// normalize position:
		var t = value;
		var end = false;
		if (t >= this.duration) {
			if (this.loop) { t = t%this.duration; }
			else {
				t = this.duration;
				end = true;
			}
		}
		if (t == this._prevPos) { return end; }
		
		// handle tweens:
		if (t != this._prevPos && this._target) {
			if (end) {
				// addresses problems with an ending zero length step.
				this._updateTargetProps(null,1);
			} else if (this._steps.length > 0) {
				// find our new tween index:
				for (var i=0, l=this._steps.length; i<l; i++) {
					if (this._steps[i].t > t) { break; }
				}
				var step = this._steps[i-1];
				this._updateTargetProps(step,(this._stepPosition = t-step.t)/step.d,t);
			}
		}
		
		// run actions:
		var prevPos = this._prevPos;
		this._prevPos = t; // set this in advance in case an action modifies position.
		this._prevPosition = value;
		if (actionsMode != 0 && this._actions.length > 0) {
			if (this._useTicks) {
				// only run the actions we landed on.
				this._runActions(t,t);
			} else if (actionsMode == 1 && t<prevPos) {
				if (prevPos != this.duration) { this._runActions(prevPos, this.duration); }
				this._runActions(0, t, true);
			} else {
				this._runActions(prevPos, t);
			}
		}

		if (end) { this.setPaused(true); }
		return end;
	}

	/** 
	 * Advances this tween by the specified amount of time in milliseconds (or ticks if useTicks is true).
	 * This is normally called automatically by the Tween engine (via Tween.tick), but is exposed for advanced uses.
	 * @method tick
	 * @param delta The time to advance in milliseconds (or ticks if useTicks is true).
	 **/
	p.tick = function(delta) {
		if (this._paused) { return; }
		this.setPosition(this._prevPosition+delta);
	}

	/** 
	 * Pauses or plays this tween.
	 * @method setPaused
	 * @param value Indicates whether the tween should be paused (true) or played (false).
	 **/
	p.setPaused = function(value) {
		if (this._paused == !!value) { return; }
		this._paused = !!value;
		Tween._register(this, !value);
	}

	// tiny api (primarily for tool output):
	p.w = p.wait;
	p.t = p.to;
	p.c = p.call;
	p.s = p.set;

	/**
	 * Returns a string representation of this object.
	 * @method toString
	 * @return {String} a string representation of the instance.
	 **/
	p.toString = function() {
		return "[Tween]";
	}
	
	/**
	 * @method clone
	 * @protected
	 **/
	p.clone = function() {
		throw("Tween can not be cloned.")
	}

// private methods:
	/**
	 * @method _updateTargetProps
	 * @protected
	 **/
	p._updateTargetProps = function(step, ratio, position) {
		var p0,p1,v,v0,v1,arr;
		if (!step && ratio == 1) {
			p0 = p1 = this._curQueueProps;
		} else {
			// apply ease to ratio.
			if (step.e) { ratio = step.e(ratio,0,1,1); }
			p0 = step.p0;
			p1 = step.p1;
		}

		for (n in this._initQueueProps) {
			if ((v0 = p0[n]) == null) { p0[n] = v0 = this._initQueueProps[n]; }
			if ((v1 = p1[n]) == null) { p1[n] = v1 = v0; }
			if (v0 == v1 || ratio == 0 || ratio == 1 || (typeof(v0) != "number")) {
				// no interpolation - either at start, end, values don't change, or the value is non-numeric.
				v = ratio == 1 ? v1 : v0;
			} else {
				v = v0+(v1-v0)*ratio;
			}
			
			var ignore = false;
			
			if (arr = Tween._plugins[n]) {
				for (var i=0,l=arr.length;i<l;i++) {
					var v2 = arr[i].tween(this, n, v, v0, v1, ratio, position, !step);
					if (v2 = Tween.IGNORE) { ignore = true; }
					else { v = v2; }
				}
			}
			if (!ignore) { this._target[n] = v; }
			
		}
		
	}
	
	/**
	 * @method _runActions
	 * @protected
	 **/
	p._runActions = function(startPos, endPos, includeStart) {
		var sPos = startPos;
		var ePos = endPos;
		var i = -1;
		var j = this._actions.length;
		var k = 1;
		if (startPos > endPos) {
			// running backwards, flip everything:
			sPos = endPos;
			ePos = startPos;
			i = j;
			j = k = -1;
		}
		while ((i+=k) != j) {
			var action = this._actions[i];
			var pos = action.t;
			if (pos == ePos || (pos > sPos && pos < ePos) || (includeStart && pos == startPos) ) {
				action.f.apply(action.o, action.p);
			}
		}
	}

	/**
	 * @method _appendQueueProps
	 * @protected
	 **/
	p._appendQueueProps = function(o) {
		var arr,value;
		for (var n in o) {
			if (this._initQueueProps[n] == null) {
				value = this._target[n];
				
				// init plugins:
				if (arr = Tween._plugins[n]) {
					for (var i=0,l=arr.length;i<l;i++) {
						value = arr[i].init(this, n, value);
					}
				}
				
				this._initQueueProps[n] = value;
			}
			this._curQueueProps[n] = o[n];
		}
		return this._curQueueProps;
	}

	/**
	 * @method _cloneProps
	 * @protected
	 **/
	p._cloneProps = function(props) {
		var o = {};
		for (var n in props) {
			o[n] = props[n];
		}
		return o;
	}

	/**
	 * @method _addStep
	 * @protected
	 **/
	p._addStep = function(o) {
		if (o.d > 0) {
			this._steps.push(o);
			o.t = this.duration;
			this.duration += o.d;
		}
		return this;
	}
	
	/**
	 * @method _addAction
	 * @protected
	 **/
	p._addAction = function(o) {
		o.t = this.duration;
		this._actions.push(o);
		return this;
	}

	/**
	 * @method _set
	 * @protected
	 **/
	p._set = function(props,o) {
		for (var n in props) {
			o[n] = props[n];
		}
	}
	
window.Tween = Tween;
}(window));
