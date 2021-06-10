---
title: "ResponseTemplate"
id: "responsetemplate"
---

API Name: sn_templated_snip.ResponseTemplate

```js
var ResponseTemplate = Class.create();
ResponseTemplate.prototype = {
    initialize: function() {
	},
	
	/**
	 * @param tableName
	 * @param recordId
	 * @param searchTerm
	 * @param limit
	 * @param offset
	 * @param includeEvaluatedBody
	 * @param errorFormat [ex:"<span style='color:#ff0000'>\$\{\%s\}</span>"]
	 * @param opts [optional parameters that can be passed to extension point's should run]
	 * @return all the templates that can be applied to a given record
	 * [
	 *  {
	 *    "sys_id": string,
	 *    "name": string,
     *    "short_name": string,
     *    "body": html body,
     *    "short_name_match": true if exact match on short_name,
     *    "evaluated_response": {
	 *	 						"success": boolean,
	 *	 						"evaluated_body": evaluated html body,
	 *	 						"error": {
	 *      								"inAccessibleVariables": string,
	 *	 	 								"unEvaluatedVariables": string,
	 *	 	 								"message": error message
	 *	 						}
	 * 	  					}
	 *  }
	 * ]
	 */
	query: function(tableName, recordId, searchTerm, limit, offset, includeEvaluatedBody, errorFormat, opts) {
        var eps = new GlideScriptedExtensionPoint().getExtensions("sn_templated_snip.response_template");
        for (var i = 0; i < eps.length; i++) {
            try {
                var ext = eps[i];
                if (ext.shouldRun(opts))
                    return ext.query(tableName, recordId, searchTerm, limit, offset, errorFormat, opts);
            } catch (e) {
                gs.error("Unable to run query method.");
            }
        }

        return new sn_templated_snippets.ResponseTemplate().query(tableName, recordId, searchTerm, limit, offset, includeEvaluatedBody, errorFormat);
    },

	/**
	 * @param templateId
	 * @param tableName
	 * @param recordId
	 * @param errorFormat [default:"<span style='color:#ff0000'>\$\{\%\s\}</span>"]
     * @param opts [optional parameters that can be passed to extension point's should run]
	 * @return template body for the given record
	 * {
	 *	 "success": boolean,
	 *	 "evaluated_body": html body,
	 *	 "error": {
	 *       "inAccessibleVariables": string,
	 *	 	 "unEvaluatedVariables": string,
	 *	 	 "message": error message
	 *	 }
	 * }
	 */
    render: function(templateId, tableName, recordId, errorFormat, opts) {
        var eps = new GlideScriptedExtensionPoint().getExtensions("sn_templated_snip.response_template");
        for (var i = 0; i < eps.length; i++) {
            try {
                var ext = eps[i];
                if (ext.shouldRun(opts))
                    return ext.render(templateId, tableName, recordId, errorFormat, opts);
            } catch (e) {
                gs.error("Unable to run render method.");
            }
        }

        return new sn_templated_snippets.ResponseTemplate().render(templateId, tableName, recordId, errorFormat);
    },

    type: 'ResponseTemplate'
};
```