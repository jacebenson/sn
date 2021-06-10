---
title: "ArrayPolyfill"
id: "arraypolyfill"
---

API Name: global.ArrayPolyfill

```js
var ArrayPolyfill;

if (!Array.prototype.find) {
	/**
	 * ES6
	 * Return the value of the first element in the array that satisfies the provided
	 * testing function, otherwise return undefined
	 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
	 */
	Array.prototype.find = function(predicate) {
		if (this == null) {
			throw new TypeError('Array.prototype.find called on null or undefined');
		}
		if (typeof predicate !== 'function') {
			throw new TypeError('predicate must be a function');
		}
		var list = Object(this);
		var length = list.length >>> 0;
		var thisArg = arguments[1];
		var value;

		for (var i = 0; i < length; i++) {
			value = list[i];
			if (predicate.call(thisArg, value, i, list)) {
				return value;
			}
		}
		return undefined;
	};
}
```