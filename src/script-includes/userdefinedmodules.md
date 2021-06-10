---
title: "UserDefinedModules"
id: "userdefinedmodules"
---

API Name: sn_devstudio.UserDefinedModules

```js
/**
 * UserDefined Navigation modules for the ServiceNow Development Studio
 */
var UserDefinedModules = {
    getModules: function(id) {

        /**
         * Return an empty array if no id exists or we are in a global context
         */
        if (!id || id.toLowerCase() === 'null' || id.toLowerCase() === 'global') {
            return [];
        }

        /**
         * Initialize the modules object and query the navigation module table.  Iterate, and
         * add the module objects.  A top level module will not have a parent, and is the root
         * for a specific set of modules (defined in the modules object with the root key).
         *
         * Each module with a populated parent field will use the parent id as the key in
         * the modules object.
         */
        var modules = {};
        var gr = new GlideRecord('sn_devstudio_navigation_module');
		gr.orderBy('order');
        gr.query();

        while (gr.next()) {
            addModules();
        }

        if (!modules.root) {
            return [];
        }

        /**
         * Recursively inject the children modules based on the parent or root field keys.
         */
        injectSubModules(modules.root);
        return modules.root;

        /**
         * Private functions
         */
        function addModules() {
            var key = gr.getValue('parent') || 'root';
            modules[key] = !modules[key] ? [] : modules[key];

            if (gr.getValue('type') == 'record_list') {
                var evaluator = new GlideScopedEvaluator();
                evaluator.putVariable('result', []);
                evaluator.evaluateScript(gr, 'script_server', null);

                var records = evaluator.getVariable('result');
                if (records && records.length > 0) {
                    modules[gr.getValue('sys_id')] = records;
                } else if (gr.getDisplayValue('has_module_action') == 'true') {
					modules[gr.getValue('sys_id')] = [];
                } else {
					return;
				}
            }

            modules[key].push(UserDefinedFileType.createFileTypeFromGlideRecord(gr));
        }

        function injectSubModules(arr) {
            var children;
            for (var i = 0; i < arr.length; i++) {
                children = modules[arr[i].sysId];
                if (children) {
                    arr[i].children = children;
                    injectSubModules(children);
                }
            }
        }
    }
};
```