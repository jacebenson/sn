---
title: "TourBuilderRecorder"
id: "tourbuilderrecorder"
---

API Name: sn_tourbuilder.TourBuilderRecorder

```js
var TourBuilderRecorder = Class.create();
TourBuilderRecorder.prototype = {
    _tbutil: new TourBuilderUtility(),
    _df: new TourBuilderGenericDataFactory(),
    _tbi: new TourBuilderIntegration(),
    errorMessages: {
        MISSING_SP_PAGE: 'Required SP_PAGE Id',
        MISSING_SP_PORTAL: 'Required SP_PORTAL Id',
    },
    _STEP_OBJECT_TO_TABLE_MAPPING: {
        //Mapping for fields in step object that have different names than in table
        'next_button': 'show_next_button',
        'pageLoaded_in_between_steps': 'wait_for_page_load'
    },
    _ELEMENT_OBJECT_TO_TABLE_MAPPING: {
        //Mapping for fields in element object that have different names than in table
    },
    initialize: function() {},
    /* create a tour with given parameters **
     ** input: tourName - name of the tour
     ** input: tourURL - url of the tour
     ** input: tourRoles - roles the tour is created for
     ** input: type - type of the tour - platform or service portal
     ** input: spPortal - name of service portal
     ** input: spPage - name of the service portal page
     ** returns: sys_id's of objects in comma separated string
     */
    createTour: function(tourName, tourURL, tourRoles, type, spPortal, spPage) {
        var status = "";
        var tourSysId = "";
        var validationResult = {};
        var result = {};
        tourName = tourName.trim();
        tourURL = tourURL.trim();
        validationResult = this.validateTour(tourName, tourURL, type, '', spPortal, spPage, true, '', false);
        if (validationResult.status === "error") {
            result.status = "error";
            result.message = validationResult.validationMessage;
            result.tourID = null;
            return result;
        }
        if (type === "platform" || type === "custom_ui") {
            if (tourURL.indexOf("?") < 0 && tourURL.indexOf(".do") >= 0)
                tourURL = tourURL.split('.do')[0];
            tourSysId = this._tbi.createGuidedTourObj(this._tbi.GUIDE_TABLE, {
                name: tourName,
                context: tourURL,
                roles: tourRoles,
                type: type,
                status: 'draft'
            });
        } else {
            // Retrive service portal and page sys_id to insert values on guided tour table.
            var gtd_page_title, gtd_portal_title;
            var gr = new GlideRecord('sp_portal');
            gr.addQuery('sys_id', spPortal);
            gr.query();
            if (!gr.hasNext()) {
                result.status = "error";
                result.message = this.errorMessages.MISSING_SP_PORTAL;
                return result;
            }
            if (gr.next()) {
                spPortal = gr.sys_id;
                gtd_portal_title = gr.title.toString();
            }
            gr = new GlideRecord('sp_page');
            gr.addQuery('sys_id', spPage);
            gr.query();
            if (!gr.hasNext()) {
                result.status = "error";
                result.message = this.errorMessages.MISSING_SP_PAGE;
                return result;
            }
            if (gr.next()) {
                spPage = gr.sys_id;
                gtd_page_title = gr.title.toString();
            }
            if (tourURL) {
                tourURL = tourURL + "&gtd_page_title=" + gtd_page_title + "&gtd_portal_title=" + gtd_portal_title;
            }
            tourSysId = this._tbi.createGuidedTourObj(this._tbi.GUIDE_TABLE, {
                name: tourName,
                context: tourURL,
                roles: tourRoles,
                type: type,
                sp_portal: spPortal,
                sp_page: spPage,
                status: 'draft'
            });
        }
        if (tourSysId !== "") {
            result.status = "success";
            result.message = "success";
            result.tourID = tourSysId;
        } else {
            result.status = "error";
            result.message = validationResult.validationMessage;
            result.tourID = null;
        }
        return result;
    },
    /* validate tour parameters **
     ** input: tourName - name of the tour
     ** input: tourURL - url of the tour
     ** input: type - type of the tour - platform or service portal
     ** input: spPortal - name of service portal
     ** input: spPage - name of the service portal page
     ** input: isNewTour - true if new tour getting created, false if old tour getting updated
     ** input: tourSysId - sys_id if tour is getting updated, '' if new tour getting created
     ** input: checkForUniqueName - true if tour name should be validated for uniqueness
	 ** input: tourId - tour_id of the tour
     ** returns: validation result object with status and validation message
     */
    validateTour: function(tourName, tourURL, type, tourId, spPortal, spPage, isNewTour, tourSysId, checkTourId) {
        var message = "";
        if (tourName == '') {
            message += "tour_error:";
            message += gs.getMessage("Tour name cannot be empty.");
        } else if (checkTourId && tourId.indexOf('TOUR') != 0 && !isNewTour) {
            message += "tour_error:";
            message += gs.getMessage("Tour ID must start with 'TOUR'");
        }
        if (!(tourURL || (spPortal && spPage))) { //either tourURL or spPortal & spPage must be there.
            message += "page_error:";
            if (type === "platform") {
                message += gs.getMessage("Page Name is mandatory.");
            } else {
                message += gs.getMessage("Portal and Starting Page Title  is mandatory.");
            }
        } else if (type === "platform" && tourURL && tourURL.match(/(nav_to|navpage)/i)) {
            message += "page_error:";
            message += gs.getMessage("Application Page name should not contain nav_to or navpage.");
        } else if (type === "platform" && tourURL && !this._tbutil.isValidTourUrl(tourURL)) {
            message += "page_error:";
            message += gs.getMessage("The Application page name you entered is not valid. Enter a valid page name.");
        }
        if (message)
            return {
                status: 'error',
                validationMessage: message
            };
        return {
            status: 'success',
            validationMessage: 'success'
        };
    },
    /* saves step object **
     ** input: stepObj - object with step properties
     ** returns: sys_id of created step
     */
    saveStep: function(stepObj) {
        var stepSysId = "";
        var tourSysId = "";
        var guidedTourSysId = "";
        var stepMap = this._STEP_OBJECT_TO_TABLE_MAPPING;
        var embededTourStepId = "";
        stepObj.guidedTourStep.guide = guidedTourSysId = stepObj.tourId;
        embededTourStepId = this._tbi.createGuidedTourObj(this._tbi.STEP_TABLE, stepObj.guidedTourStep);
        return embededTourStepId;
    },
    /* saves element object **
     ** input: elementObj - object with element properties
     ** returns: resultObj - object with sysId and embededTourElementId
     **                      of the created element
     */
    saveElement: function(elementObj) {
        var resultObj = {};
        var embededTourElementId = "";
        var elementMap = this._ELEMENT_OBJECT_TO_TABLE_MAPPING;
        var elementParams = [];
        var columnName;
        // Readonly refrence field ids are ends with _label
        var re = new RegExp("_label$");
        if (elementObj.guidedToursElement.type === "form" && re.test(elementObj.guidedToursElement.field)) {
            var table = elementObj.guidedToursElement.table;
            var field = elementObj.guidedToursElement.field;
            var gr = new GlideRecord(table);

            if (!gr.isValidField(field)) {
                field = field.substr(0, field.length - 6); // truncate _label
                if (gr.isValidField(field))
                    elementObj.guidedToursElement.field = field;
            }
        }
        embededTourElementId = this._tbi.createGuidedTourObj(this._tbi.ELEMENT_TABLE, elementObj.guidedToursElement);
        resultObj.guidedTourSysId = embededTourElementId;
        return resultObj;
    },
    /* update a tour step **
     ** input: stepObj - object with step properties
     ** returns: sys_id of the updated step
     */
    updateStep: function(stepObj) {
        var stepMap = this._STEP_OBJECT_TO_TABLE_MAPPING;
        var stepSysId = "";
        var query_params = [];

        query_params.push({
            "column": "guide",
            "value": stepObj.tourId
        });
        query_params.push({
            "column": "sys_id",
            "value": stepObj.stepSysId
        });
        query_params.push({
            "column": "active",
            "value": true
        });
        stepSysId = this._df.getObjects({
            "table": this._tbi.STEP_TABLE,
            "query_params": query_params
        });
        var guidedTourStepUpdated = this._tbi.updateGuidedTourObj(this._tbi.STEP_TABLE, stepObj.guidedTourStep, {
            'sys_id': stepSysId,
            'stepSysId': stepSysId
        });
        return guidedTourStepUpdated;
    },
    getStepSysIds: function(tourSysId) {
        var stepsList = [];
        var tableName = this._tbi.STEP_TABLE;
        var stepNumField = "order";
        var tourIdField = "guide";
        var gr = new GlideRecord(tableName);
        var gr1 = gr.addQuery('step_type', 'step');
        gr1.addOrCondition('step_type', '');
        gr.addQuery(tourIdField, tourSysId);
        gr.addQuery('active', true);
        gr.orderBy(stepNumField);
        gr.query();
        while (gr.next()) {
            stepsList.push(gr.sys_id.toString());
        }
        return stepsList;
    },
    /* swap two tour steps **
     ** input: tourSysId - sys_id of the tour associated to the step
     ** input: sourceStepNo - step number of source step
     ** input: destStepNo - step number of destination step
     */
    swapSteps: function(tourSysId, sourceStepNo, destStepNo) {
        var stepsList = [];
        var stepObject = {};
        var tableName = "";
        var stepNumField = "";
        var tourIdField = "";
        var stepNumber = null;
        var i = 0;
        tableName = this._tbi.STEP_TABLE;
        stepNumField = "order";
        tourIdField = "guide";
        stepsList = this.getStepSysIds(tourSysId);
        // steps should be in 1 based numbering, to work properly for this API.
        stepObject = this._df.getObjectData({
            'sys_id': stepsList[0],
            'table': tableName
        });
        // update the steps order in 1 based numbering if not
        if (stepObject.order !== 1) {
            for (i = 0; i < stepsList.length; i++) {
                this._df.updateObject({
                    'table': tableName,
                    'sys_id': stepsList[i],
                    'update_params': [{
                        'column': stepNumField,
                        'value': i + 1
                    }]
                });
            }
        }
        if (sourceStepNo > destStepNo) {
            for (i = 0; i < stepsList.length; i++) {
                stepObject = this._df.getObjectData({
                    'sys_id': stepsList[i],
                    'table': tableName
                });
                stepNumber = stepObject.order;
                if (stepNumber == sourceStepNo) {
                    this._df.updateObject({
                        'table': tableName,
                        'sys_id': stepsList[i],
                        'update_params': [{
                            'column': stepNumField,
                            'value': destStepNo
                        }]
                    });
                } else if (stepNumber >= destStepNo && stepNumber < sourceStepNo) {
                    this._df.updateObject({
                        'table': tableName,
                        'sys_id': stepsList[i],
                        'update_params': [{
                            'column': stepNumField,
                            'value': (parseInt(stepNumber) + 1)
                        }]
                    });
                }
            }
        } else {
            for (i = 0; i < stepsList.length; i++) {
                stepObject = this._df.getObjectData({
                    'sys_id': stepsList[i],
                    'table': tableName
                });
                stepNumber = stepObject.order;
                if (stepNumber == sourceStepNo) {
                    this._df.updateObject({
                        'table': tableName,
                        'sys_id': stepsList[i],
                        'update_params': [{
                            'column': stepNumField,
                            'value': destStepNo
                        }]
                    });
                } else if (stepNumber > sourceStepNo && stepNumber <= destStepNo) {
                    this._df.updateObject({
                        'table': tableName,
                        'sys_id': stepsList[i],
                        'update_params': [{
                            'column': stepNumField,
                            'value': (parseInt(stepNumber) - 1)
                        }]
                    });
                }
            }
        }
    },
    /* delete a tour step **
     ** input: tourSysId - sys_id of the tour associated to the step
     ** returns: stepNo - number of the step to be deleted
     */
    deleteStep: function(tourSysId, sysIdStep) {
        var stepSysId = "";
        var stepObject = {};
        var targetSysId = "";
        var steps;
        var stepsList;
        /** Delete step and corresponding elements **/
        stepSysId = this._df.getObjects({
            'table': this._tbi.STEP_TABLE,
            'query_params': [{
                'column': 'guide',
                'value': tourSysId
            }, {
                'column': 'sys_id',
                'value': sysIdStep
            }, {
                "column": "active",
                "value": true
            }]
        });
        stepObject = this._df.getObjectData({
            'sys_id': stepSysId,
            'table': this._tbi.STEP_TABLE,
            'override_columns': {
                'target_ref': 'targetRef'
            }
        });
        targetSysId = stepObject.targetRef;
        var stepDeleted = this._tbi.deleteGuidedTourObj(this._tbi.STEP_TABLE, {
            'sys_id': stepSysId
        });
        if (stepDeleted) {
            /**Delete associated element object **/
            var elementDeleted = this._tbi.deleteGuidedTourObj(this._tbi.ELEMENT_TABLE, {
                'sys_id': targetSysId
            });
            /** Updating order for remaining steps **/
            stepsList = this.getStepSysIds(tourSysId);
            for (var i = 0; i < stepsList.length; i++) {
                this._df.updateObject({
                    'table': this._tbi.STEP_TABLE,
                    'sys_id': stepsList[i],
                    'update_params': [{
                        'column': 'order',
                        'value': i + 1
                    }]
                });
            }
        }
        return stepDeleted;
    },
    type: 'TourbuilderRecorder'
};
```