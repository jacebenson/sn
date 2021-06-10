---
title: "ViewCloneDefaultAjax"
id: "viewclonedefaultajax"
---

API Name: global.ViewCloneDefaultAjax

```js
var ViewCloneDefaultAjax = Class.create();

ViewCloneDefaultAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	start: function() {
		var parameters = {
			sysparm_view: this._getParameter('sysparm_view'),
			sysparm_title: this._getParameter('sysparm_title'),
			sysparm_sections: this._getParameter('sysparm_sections'),
			sysparm_table: this._getParameter('sysparm_table')
		};
		var worker = new GlideScriptedHierarchicalWorker();
		worker.setProgressName('Cloning Default View');
		worker.setBackground(true);
		worker.setScriptIncludeName('ViewCloneDefaultWorker');
		worker.setScriptIncludeMethod('process');
		worker.putConstructorArg('parameters', JSON.stringify(parameters));
		worker.start();
		return worker.getProgressID();
	},

	// Avoids getting the string "null" and "undefined"
	_getParameter: function(name) {
		var value = this.getParameter(name);
		if (value !== null && value !== undefined)
			return String(value);

		return value;
	},

	type: 'ViewCloneDefaultAjax'

});
```