---
title: "_gr"
id: "_gr"
---

API Name: sn_devstudio._gr

```js
var _gr = function(gr) {
	return {
		map : function(iteratee, context) {
			var collection = [];
			while (gr.next()) {
				collection.push(iteratee.call(context || this, gr));
			}
			return collection;
		},
		each : function(iteratee, context) {
			while (gr.next()) {
				iteratee.call(context || this, gr);
			}
		},
		reduce : function(iteratee, memo, context) {
			while (gr.next()) {
				memo = iteratee.call(context || this, memo, gr);
			}
			return memo;
		}
	}
}
```