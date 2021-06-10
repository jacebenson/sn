---
title: "MultiElementSelectionUtil"
id: "multielementselectionutil"
---

API Name: global.MultiElementSelectionUtil

```js
/**
 * This script include is called from ui_action(pa_widgets) and business rules (pa_widgets,pa_indicators)
 * This returns what should be the value of multiple_elements_view field of widget based on indicator
 * aggregate type and type of widget.
 * STRY50074235
 */

var MultiElementSelectionUtil = Class.create();
MultiElementSelectionUtil.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getValueForMultipleElements: function () {
		var config = this.getParameter('sysparm_config');
		return SNC.PAMultiElementUtil.getOptionsForMultipleElements(config);
	},
	
	isMultiElementSupported : function () {
		var config = this.getParameter('sysparm_config');
		return SNC.PAMultiElementUtil.isMultiElementSupportAggregation(config);
	},
	type: 'MultiElementSelectionUtil'
});
```