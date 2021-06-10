---
title: "ElementGlideListAjax"
id: "elementglidelistajax"
---

API Name: global.ElementGlideListAjax

```js
// NOTE:  When updating this code, be sure and run the tests for Glide List found in the com.snc.test_table plugin. 
// After activing the plugin navigate to Test Table -> Defaults & Client Scripts module and click the 
// "Test glide_list client scripts" button.
var ElementGlideListAjax = Class.create();

ElementGlideListAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
  process: function() {
      if (this.getType() == "getDisplayValues")
          this.getDisplayValues(this.getValue());
      else if (this.getType() == "getChoiceLabels")
          this.getChoiceLabels(this.getName(), this.getValue());
  },
  // Get the labels for given values and return everything in the same order it came in so onChange works correctly.
  getChoiceLabels: function(name, values) {
	var result = SNC.NGGlideListElementUtil.getChoiceLabels(name, values);
	var resultJson = JSON.parse(result);
	var count = 0;
	if (resultJson) {
		for (var i in resultJson) {
			var item = this.newItem("choice");
			item.setAttribute('value', resultJson[i].value);
			item.setAttribute('display', resultJson[i].display);
			count++;
		}
	}
	return count;
  },
  // Get the display values for the table and sys_ids specified and return everything in the same order it came in so onChange works correctly.
  getDisplayValues: function(tableAndIds) {
	 //calling the glide scriptable method
	 var result = SNC.NGGlideListElementUtil.getDisplayValues(tableAndIds);
	 var resultJson = JSON.parse(result);
     var count = 0;
	 if (resultJson) {
		 for (var i in resultJson) {
			 var item = this.newItem("reference");
			 item.setAttribute('sys_id', resultJson[i].sys_id);
			 item.setAttribute('display', resultJson[i].display);
			 count++;
		 }
	 }
     return count;
  },


  type: "ElementGlideListAjax"
});
```