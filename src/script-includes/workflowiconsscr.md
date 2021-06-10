---
title: "WorkflowIconsSCR"
id: "workflowiconsscr"
---

API Name: global.WorkflowIconsSCR

```js
/**
 * This is only used to handle Request Items with a Delivery Plan or a Workflow.
 */
gs.include("PrototypeServer");

var WorkflowIconsSCR = Class.create();
WorkflowIconsSCR.prototype = Object.extendsObject(WorkflowIconsStages, { 
   
   initialize: function(ref) {
      this.elementName = ref;
      this.element = GlideEvaluator.evaluateString(ref);
      this.gr = this.element.getGlideRecord();
   },
   
   process: function(cl) {
   
   	  function isError(cl) {
		  if (cl.getSize() == 1)
			  if (cl.getChoice(0).value == 'error')
				  return true;
		  return false;
	  }
	  
	  if (isError(cl))
		  return cl;

      return WorkflowIconsStages.prototype.process.call(this, cl);
	   
   },
 
   type: "WorkflowIconsSCR"
});
```