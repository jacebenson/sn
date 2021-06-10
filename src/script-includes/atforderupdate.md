---
title: "ATFOrderUpdate"
id: "atforderupdate"
---

API Name: global.ATFOrderUpdate

```js
var ATFOrderUpdate = Class.create();
ATFOrderUpdate.prototype = {
    initialize: function() {
    },

	getNextOrder: function(tableName, testId) {
		var ga = new GlideAggregate(tableName);
		ga.addQuery("test", testId);
		ga.addAggregate("COUNT");
		ga.query();
		if (ga.next())
			return parseInt(ga.getAggregate("COUNT"), 10)+1;

		return 1;
	},

	reorderAfterRemove: function(tableName, currGr) {
		var gr = new GlideRecord(tableName);
		gr.addQuery("test", currGr.test);
		gr.orderBy('order');
		gr.query();
		var smallestRemovedNumber = 1;
		while (gr.next()) {
			if(parseInt(gr.order, 10) !== smallestRemovedNumber) {

				// Make it zero so all upcoming are decremented
				smallestRemovedNumber = 0;
				gr.order--;
				gr.setWorkflow(false);
				gr.update();

				// generate the customer update
				gr.setWorkflow(true);
				gr.setForceUpdate(true);
				gr.update();
			} else {
				smallestRemovedNumber++;
			}
		}

		if (tableName == 'sys_atf_step')
			this.updateStepsThatReferenceStepNumbersInDescription(currGr);
	},
	
	updateOrder : function (tableName, currGr, prevGr) {
		var ga = new GlideAggregate(tableName);
		ga.addQuery("test", currGr.test);
		ga.addAggregate("COUNT");
		ga.query();
		if (ga.next()) {
			var numberOfSteps = parseInt(ga.getAggregate("COUNT"), 10);
			if (!this.justEndsMovedOutOfRange(currGr, prevGr, numberOfSteps)) {
				this.reorderStepsBetween(tableName, currGr, prevGr.getValue('order'), numberOfSteps);
				if (tableName == 'sys_atf_step')
					this.updateStepsThatReferenceStepNumbersInDescription(currGr);
			}
		}
	},
	
	updateRecordsAfterCurrent : function (tableName, currGr) {
		var ga = new GlideAggregate(tableName);
		ga.addQuery("test", currGr.test);
		ga.addAggregate("COUNT");
		ga.query();

		if (ga.next()) {

			// current is not counted, so adding by one
			var numberOfSteps = parseInt(ga.getAggregate("COUNT"), 10) + 1;
			if (this.withinRange(currGr, numberOfSteps)) {
				this.shiftUpStepsAfter(tableName, currGr);
				if (tableName == 'sys_atf_step')
					this.updateStepsThatReferenceStepNumbersInDescription(currGr);
			}
		}
	},
	
	justEndsMovedOutOfRange : function (currGr, prevGr, highestNumber) {
        if (prevGr.order == 1 && currGr.order < prevGr.order) {
            currGr.order = 1;
            return true;
        } else if (prevGr.order == highestNumber && currGr.order > prevGr.order) {
            currGr.order = highestNumber;
            return true;
        }
        return false;
    },
	
	shiftUpStepsAfter : function (tableName, afterThisRecord) {
        var gr = new GlideRecord(tableName);
        gr.addQuery("test", afterThisRecord.test);
        gr.addQuery("order", '>=', afterThisRecord.order);
        gr.orderByDesc('order');
        gr.query();
        while (gr.next()) {
            gr.order++;
            gr.setWorkflow(false);
            gr.update();

            // generate the customer update
            gr.setWorkflow(true);
            gr.setForceUpdate(true);
            gr.update();
        }
    },
	
	reorderStepsBetween : function(tableName, currGr, prevGrStepNumber, totalNumberOfSteps) {
        this.withinRange(currGr, totalNumberOfSteps);

        // The way to make sense of this algo is to account for two scenarios:
        // 1. If I'm replacing a step number less than me, that number
        //      and numbers less than my prevGr, need to shift up
        // 2. If I'm replacing a step number greater than me, that number
        //      and numbers greater than my prevGr, need to shift down
        // However, in both cases, we need to start the shift with the step closest to the gap
        // in order to prevent index collision.
        var startingStepNumber = totalNumberOfSteps;
        var endingStepNumber = totalNumberOfSteps;
        var shiftValue = 0;
        var gr = new GlideRecord(tableName);
        gr.addQuery("test", currGr.test);
        if (currGr.order > prevGrStepNumber) {
            startingStepNumber = prevGrStepNumber;
            endingStepNumber = currGr.getValue('order');
            shiftValue = -1;
            gr.addQuery("order", '>', startingStepNumber);
            gr.addQuery("order", '<=', endingStepNumber);
            gr.orderBy('order');
        } else {
            startingStepNumber = currGr.getValue('order');
            endingStepNumber = prevGrStepNumber;
            shiftValue = 1;
            gr.addQuery("order", '>=', startingStepNumber);
            gr.addQuery("order", '<', endingStepNumber);
            gr.orderByDesc('order');
        }
        gr.addQuery("sys_id", '!=', currGr.sys_id);

        // Two pass takes a snapshot of our gliderecord's ordering before our shifting operation
        gr.setTwoPass();
        gr.query();

        // Another index collision prevention measure is to temporarily place currGr to the largest new
        // position, during the shift, before placing it back to its new position.
        var currGrStepNumber = currGr.getValue('order');
        currGr.order = totalNumberOfSteps + 1;
        currGr.setSystem(false);
        currGr.setWorkflow(false);
        currGr.update();

        while (gr.next()) {
            gr.order += shiftValue;
            gr.setWorkflow(false);
            gr.update();

            // generate the customer update
            gr.setWorkflow(true);
            gr.setForceUpdate(true);
            gr.update();
        }

        currGr.setWorkflow(true);
        currGr.setSystem(true);
        currGr.order = currGrStepNumber;
        currGr.update();
    },
	
	withinRange : function (currGr, highestNumber) {
        if (gs.nil(currGr.order) || currGr.order >= highestNumber) {
            currGr.order = highestNumber;
            return false;
        } else if (currGr.order < 1) {
            currGr.order = 1;
            return true;
        }
        return true;
    },
	
	updateStepsThatReferenceStepNumbersInDescription: function (currGr){
        var gr = new GlideRecord('sys_atf_step');
        gr.addQuery("test", currGr.test);
        gr.addQuery("description", "CONTAINS", "\{\{Step");
        gr.query();

        while (gr.next()) {
            gr.setForceUpdate(true);
            gr.update();
        }
    },
    type: 'ATFOrderUpdate'
};
```