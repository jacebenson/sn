---
title: "AJAXSubscriptionSummaryWorker"
id: "ajaxsubscriptionsummaryworker"
---

API Name: global.AJAXSubscriptionSummaryWorker

```js
var AJAXSubscriptionSummaryWorker = Class.create();


AJAXSubscriptionSummaryWorker.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
	start: function() {
		
		if (!this.canProceed())
			return;
		
		var summarizer = new SNC.SubscriptionSummarizer();
		summarizer.runSummary();
		
		var progressId = summarizer.getProgressWorkerId();
		
		gs.log("AJAXSubscriptionSummaryWorker: getProgressID = " + progressId);
		
		return progressId;
	},
	
	canProceed: function(){
	
		if (gs.hasRole("admin") || gs.hasRole("usage_admin"))
			return true;
		
		return false;
	}
});


```