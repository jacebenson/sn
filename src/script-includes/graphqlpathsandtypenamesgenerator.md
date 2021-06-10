---
title: "GraphQLPathsAndTypeNamesGenerator"
id: "graphqlpathsandtypenamesgenerator"
---

API Name: global.GraphQLPathsAndTypeNamesGenerator

```js
var GraphQLPathsAndTypeNamesGenerator = (function() {
    function getMappedFields(schemaId, mapping) {
        var mappedFields = new GlideRecord(mapping.table);
        mappedFields.addQuery('schema', schemaId);
        mappedFields.query();

        var fields = [];
        while (mappedFields.next())
            fields.push(mappedFields[mapping.column].toString());

        return fields;
    }

    function getChoices(exclusions, fields) {
        return fields.reduce(function(choices, field) {
            if (exclusions.indexOf(field) === -1)
                choices.add(field, field);

            return choices;
        }, new GlideChoiceList());
    }

    function getAvailableFields(schemaId, column) {
        var schema = new GlideRecord('sys_graphql_schema');
        if (JSUtil.nil(schemaId) || !schema.get(schemaId))
            return [];

        return schema[column].split(',');
    }

    function createMappingChoiceGenerator(options) {
        return function(schemaId) {
            var fields = getAvailableFields(schemaId, options.schemaColumn);
            if (fields.length === 0)
                return new GlideChoiceList();

            var mappedFields = getMappedFields(schemaId, options.mapping);
            return getChoices(mappedFields, fields);
        };
    }

    return {
        getPathMappingChoices: createMappingChoiceGenerator({
            schemaColumn: 'paths',
            mapping: {
                table: 'sys_graphql_resolver_mapping',
                column: 'path'
            }
        }),
        getTypeMappingChoices: createMappingChoiceGenerator({
            schemaColumn: 'type_names',
            mapping: {
                table: 'sys_graphql_typeresolver',
                column: 'type_name'
            }
        })
    };
})();
```