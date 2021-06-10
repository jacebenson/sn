---
title: "TourBuilderUtility"
id: "tourbuilderutility"
---

API Name: sn_tourbuilder.TourBuilderUtility

```js
var TourBuilderUtility = Class.create();
TourBuilderUtility.prototype = {
    _df: new TourBuilderGenericDataFactory(),
    _odf: new TourBuilderObjectDataFactory(),
    _tbh: new global.GuidedTourDesignerHelper(),

    initialize: function() {},

    /* check if given tour_id corresponds to a valid tour **
     ** input: tour_id - tour_id under consideration
     ** returns: true/false
     */

    isValidTour: function(tour_id) {
        var args = {};

        args.tour_id = tour_id;
        var tourSysId = this._odf.getTourdetails(args);

        if (tourSysId !== "")
            return true;

        return false;
    },

    /* fetch a tour object from tour_id **
     ** input: tour_id - tour_id of the tour to be fetched
     ** returns: object
     */
    getTourObject: function(tour_id, objectFields) {
        var tourObject = {};
        var overrideColumns = {};

        for (var i = 0; i < objectFields.length; i++)
            overrideColumns[objectFields[i]] = objectFields[i];

        tourObject = this._df.getObjectData({
            'sys_id': tour_id,
            'table': 'sys_embedded_tour_guide',
            'override_columns': overrideColumns
        });

        return tourObject;
    },

    getToursByName: function(tour_name) {
        var query_params = [];
        query_params.push({
            "column": "name",
            "value": tour_name
        });
        query_params.push({
            "column": "active",
            "value": true
        });
        var tours = this._df.getObjects({
            'table': 'sys_embedded_tour_guide',
            'query_params': query_params
        });

        var resultObj = {};

        if (tours === '') {
            resultObj.status = 'error';
            resultObj.message = gs.getMessage('No tour with the given name found.');
            resultObj.tourRecords = '';
            return resultObj;
        }

        resultObj.status = 'success';
        resultObj.message = gs.getMessage('Found tour(s) matching the given name: {0}', tours);
        resultObj.tourRecords = tours;

        return resultObj;
    },
	
	getToursByTourId: function(tourId) {
        var query_params = [];
        query_params.push({
            "column": "tour_id",
            "value": tourId
        });
        query_params.push({
            "column": "active",
            "value": true
        });
        var tours = this._df.getObjects({
            'table': 'sys_embedded_tour_guide',
            'query_params': query_params
        });

        var resultObj = {};

        if (tours === '') {
            resultObj.status = 'error';
            resultObj.message = gs.getMessage('No tour with the given tour ID found.');
            resultObj.tourRecords = '';
            return resultObj;
        }

        resultObj.status = 'success';
        resultObj.message = gs.getMessage('Found tour(s) matching the given tour ID: {0}', tours);
        resultObj.tourRecords = tours;

        return resultObj;
    },

    isValidTourUrl: function(startUrl) {

        var urlWhitelist = ['home'];

        var urlLength = startUrl.length;

        //if url is of the format 'abc.do?xxxx', e.g. 'incident.do?sys_id=abc'
        //truncate everythign after '?'
        if (startUrl.indexOf('?') > 0) {
            startUrl = startUrl.substring(0, startUrl.indexOf('?'));
            urlLength = startUrl.length;
        }

        //truncate string after and including '.do'
        if (startUrl.indexOf('.do') > 0) {
            //after truncation url should end with '.do'
            //following code intercepts error case scenarios e.g. '.doxx'
            if (startUrl.substring(startUrl.indexOf('.do'), startUrl.length) != '.do')
                return false;

            //ui page endpoints end with .do
            //therefore validate the startUrl for valid ui page endpoint before truncating .do
            if (this.isValidUiPageEndpoint(startUrl))
                return true;

            startUrl = startUrl.substring(0, startUrl.indexOf('.do'));
            urlLength = startUrl.length;
        }

        //truncate '_list' from end of string
        var indexofList = startUrl.lastIndexOf('_list');
        if (indexofList > 0) {
            //after truncation url should end with '.do'
            //following code intercepts error case scenarios e.g. '_listxx'
            //PRB1353494 Tour starting on Targeted communication- recipient lists page cannot be created and an error is thrown on the page.

            if (startUrl.substring(indexofList, urlLength) != '_list')
                return false;

            startUrl = startUrl.substring(0, indexofList);
            urlLength = startUrl.length;
        }

        //do not allow tour creation on tour_builder table itself
        if (startUrl.indexOf('tour_builder') == 0)
            return false;

        //if startUrl corresponds to a valid table
        if (gs.tableExists(startUrl))
            return true;

        //if startUrl corresponds to a valid UI page
        if (this.isValidUiPageName(startUrl))
            return true;

        //if startUrl corresponds to a valid processor
        //note: to be un-commented when processor names are considered as valid Application Page Names
        /*
        if(this.isValidProcessorPath(startUrl)){
        	return true;
        }
        */

        //if startUrl corresponds to a valid whitelisted url
        if (urlWhitelist.indexOf(startUrl) >= 0)
            return true;

        return false;
    },

    isValidUiPageEndpoint: function(endpoint) {
        var query_params = [];
        query_params.push({
            "column": "endpoint",
            "value": endpoint
        });
        var uiPageRecord = this._df.getObjects({
            'table': 'sys_ui_page',
            'query_params': query_params
        });

        if (uiPageRecord === '')
            return false;
        else
            return true;
    },

    isValidUiPageName: function(uipagename) {
        var query_params = [];
        query_params.push({
            "column": "name",
            "value": uipagename
        });
        var uiPageRecord = this._df.getObjects({
            'table': 'sys_ui_page',
            'query_params': query_params
        });

        if (uiPageRecord === '')
            return false;
        else
            return true;
    },

    isValidProcessorPath: function(processorpath) {
        var query_params = [];
        query_params.push({
            "column": "path",
            "value": processorpath
        });
        var processorRecord = this._df.getObjects({
            'table': 'sys_processor',
            'query_params': query_params
        });

        if (processorRecord === '')
            return false;
        else
            return true;
    },

    getActionSysid: function(elementObj) {
        var query_params = [];
        query_params.push({
            "column": "table",
            "value": elementObj.actionTable
        });
        query_params.push({
            "column": "name",
            "value": elementObj.actionName
        });
        var uiActionRecord = this._df.getObjects({
            'table': 'sys_ui_action',
            'query_params': query_params
        });

        if (uiActionRecord !== '') {
            return uiActionRecord;
        }

        return "submit";
    },

    //fetch all the roles assigned to the user
    getRolesForUser: function(userID) {
        var gr = new GlideRecord('sys_user_has_role');
        var data = [];
        gr.addQuery('user', userID);
        gr.query();
        while (gr.next())
            data.push(gr.role.name);

        return data;
    },

    canUserEditTour: function(tourId) {
        var obj = {};

        if (gs.nil(tourId)) {
            obj.status = "error";
            obj.message = "Invalid tour Sys ID";

            return obj;
        }

        var isUI16Enabled = this.isUI16Enabled();
        if (isUI16Enabled === false) {
            obj.status = "error";
            obj.message = "Guided Tour Designer is supported for UI16 and above.";

            return obj;
        }

        var isUserAndTourDomainSame = this.isUserAndTourDomainSame(tourId);
        if (isUserAndTourDomainSame === false) {
            obj.status = "error";
            obj.message = "Record domain is different from current active domain. Change the current domain to record's domain to edit the record.";

            return obj;
        }

        obj.status = "success";
        obj.message = "Success";

        return obj;
    },

    isUserAndTourDomainSame: function(tourId) {

        if (gs.nil(tourId))
            return false;

        if (GlidePluginManager.isActive("com.glide.domain") && gs.getProperty("glide.sys.domain.delegated_administration")) {
            var tour = new GlideRecord('sys_embedded_tour_guide');
            tour.get(tourId);
            var tourDomain = tour.sys_domain;

            var curDomain = this._tbh.getCurrentDomain();

            if (tourDomain != curDomain)
                return false;
        }

        return true;
    },

    isUI16Enabled: function() {
        // Returns boolean
        var x = GlidePluginManager.isActive("com.glide.ui.concourse");

        // Returns string "true" or "false"
        var y = this._tbh.getUserUI16Preference();

        if (x === true && y === 'true')
            return true;

        return false;
    },
    /* 
    	Returns an array of roles of the user that matches the current tour roles.
    	If the tour has no roles, then all the roles of the user are returned.
    */
    getMatchingRoles: function(userId, tourIdOrObject) {
        var userRoles = this.getRolesForUser(userId);
        var tour = typeof(tourIdOrObject) === 'string' ?
            this.getTourObject(tourIdOrObject, ['sys_id', 'name', 'roles', 'autolaunch_order', 'active',
                'status'
            ]) :
            tourIdOrObject;
        var matchedRoles = [];
        if (tour.roles.length === 0) {
            matchedRoles = userRoles.map(function(r) {
                return r;
            });
        } else {
            userRoles.forEach(function(r) {
                if (tour.roles.indexOf(r) > -1) {
                    matchedRoles.push(r);
                }
            });
        }
        return matchedRoles;
    },
    /*
      getAppDetails - Returns the application for the given tour
    */
    getAppDetails: function(sys_id) {
        if (!sys_id)
            return null;

        var page = null;
        var gr = new GlideRecord('sys_embedded_tour_guide');
        gr.addQuery('sys_id', sys_id);
        gr.query();

        if (gr.next())
            page = gr.sys_scope.toString();

        return page;
    },
    // determine if table has restricted caller access 
    isRestrictedCallerAccess: function(table) {
        if (GlidePluginManager.isActive('com.glide.scope.access.restricted_caller')) {
            var gr = new GlideRecord('sys_db_object');
            gr.addQuery('name', table);
            gr.query();
            if (gr.next())
                return gr.caller_access == 2;
        }
        return false;
    },
    type: 'TourBuilderUtility'
};
```