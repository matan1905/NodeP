function Nodep(head) {
    //tables
    var nodes_table = {};
    var attributes_table = {};
    //globals
    var node_scope = {};
    var debug = false;
    var events_store = {};
    var event_counter = 0;
    var actual_node_scope = node_scope
    var nodp = this;
    var imported_packages=[];
    var imported_extensions=[];

    var push_scope = function(element) {
        var offset_object = {
            element: element,
            previous: node_scope,
            scope_variables: {},
            evaluation_result: null
        }
        node_scope = offset_object;
    }

    var pop_scope = function() {
        node_scope = node_scope.previous;
    }

    var evaluate_attributes = function(element) {
        push_scope(element);
        if (!element.nodeName) throw ("Evaluating non-element!")
        var attributes = element.attributes;
        if (attributes)
            for (var i = 0; i < attributes.length; i++) {
                var attribute = attributes[i];
                attribute_name = attribute.name.toUpperCase();
                var attribute_table_object = attributes_table[attribute_name]
                if (attribute_table_object) {
                    if (typeof attribute_table_object === "function") attribute_table_object(element);
                    else nodp.apply_evaluation(attribute_table_object.cloneNode(true));
                } else {
                    throw ("Attempt to evaluate undefined attribute: " + attribute.name);
                }
            }
        //   pop_scope();
    }

    var evaluate_node = function(element) {
        // push_scope(element);

        var evaluated_result = null;
        if (!element.nodeName) throw ("Evaluating non-element! try wrapping with <name> node")
        var node_name = element.nodeName.toUpperCase();
        var node_table_object = nodes_table[node_name]
        if (node_table_object) {
            if (typeof node_table_object === "function") evaluated_result = node_table_object(element);
            else evaluated_result = nodp.apply_evaluation(node_table_object.cloneNode(true));
            node_scope.evaluation_result = evaluated_result;
        } else {
            throw ("Attempt to evaluate undefined node: " + element.nodeName);
        }

        if (debug) {
            debug = false;
            console.log(node_scope);
        }


        pop_scope();
        return evaluated_result;
    }

    nodp.apply_evaluation = function(element) { //used to sum these together, evaluating using args is a better option
        evaluate_attributes(element);
        return evaluate_node(element);
    }
    //language level
    //global definitions
    nodp.define_node = function(name, element_or_function) {
        nodes_table[name.toUpperCase()] = element_or_function;
    }

    nodp.define_attribute = function(name, element_or_function) {
        attributes_table[name.toUpperCase()] = element_or_function;
    }

    //scope definitions
    nodp.set_variable = function(name, element) {
        var temp_scope = node_scope;
        while (temp_scope['previous']) {
            if (temp_scope.scope_variables[name] !== undefined) {
                temp_scope.scope_variables[name] = element
                return element;
            }
            temp_scope = temp_scope['previous']
        }
        node_scope.previous.scope_variables[name] = element; //previous because the set is a scope of it's own!
        return element;
    }

    nodp.get_variable = function(name) {
        var temp_scope = node_scope;
        var found = false;
        var result = null;
        while (temp_scope['previous']) {
            if (temp_scope.scope_variables[name] !== undefined) {
                found = true;
                result = temp_scope.scope_variables[name];
                break;
            }
            temp_scope = temp_scope['previous']
        }
        if (!found) {
            throw "Unable to find variable named: " + name;
        }

        return result;
    }

    nodp.is_variable_set = function(name) {
        var temp_scope = node_scope;
        var found = false;
        while (temp_scope['previous']) {
            if (temp_scope.scope_variables[name] !== undefined) {
                found = true;
                break;
            }
            temp_scope = temp_scope['previous']
        }
        return found;
    }



    nodp.error = function(message) {
        console.error(message);
        console.error(node_scope)
    }



    var htmlToElement = function(html) {
        var template = document.createElement('template');
        html = html.trim(); // Never return a text node of whitespace as the result
        template.innerHTML = html;
        return template.content.firstChild;
    }

    nodp.get_evaluated_argument = function(element, child = 0) {
        if (!element || !element.children) return null;

        evaluate_attributes(element.children[child]);
        return evaluate_node(element.children[child]) //<- evaluate node
    }

    nodp.get_unevaluated_argument = function(element, child) {
        return element.children[child];
    }

    nodp.make_string_from_children = function(element) {
        var str = "";
        var temp_result
        for (var i = 0; i < element.childNodes.length; i++) {
            if (element.childNodes[i].nodeName.toUpperCase() == '#COMMENT' ||
                (element.childNodes[i].nodeName.toUpperCase() == '#TEXT' && element.childNodes[i].textContent.replace(/\s/g, '').length == 0)
            ) continue;
            evaluate_attributes(element.childNodes[i]);
            str += evaluate_node(element.childNodes[i]);
        }
        return str;
    }

    var stringToBoolean = function(string) {
        switch (string.toLowerCase().trim()) {
            case "false":
            case "no":
            case "0":
            case null:
                return false;
            default:
                return Boolean(string);
        }
    }

    nodp.evaluate_all_children = function(element, starting_index = 0) {
        var last_evaluation = element;
        for (var i = starting_index; i < element.children.length; i++) {
            last_evaluation = nodp.get_evaluated_argument(element, i);

        }
        return last_evaluation;
    }

    var addBaseAttributes = function(head) {
        var base_attributes = {
            // Stub functions to prevent undefined attribute, could be redefined by user
            'id': function(element) {},
            'hidden': function(element) {},
            'debug': function(element) {
                debug = true;
            },
            'event-id': function(element) {

                //find a wanting of event and make it the event id
            },

        }

        Object.keys(base_attributes).forEach(function(key) {
            nodp.define_attribute(key.toUpperCase(), base_attributes[key]);
        });
    }





    var addBaseNodes = function(head) {
        var base_functions = {
            'print': function(element) {
                if (element.children.length != 1) {
                    var str = nodp.make_string_from_children(element);
                    console.log(str);
                    return str
                } else {
                    console.log(nodp.get_evaluated_argument(element, 0));
                    return element;
                }
            },
            'begin': function(element) {
                return nodp.evaluate_all_children(element);
            },
            '#TEXT': function(element) {
                return element.textContent
            },
            'name': function(element) {
                return nodp.make_string_from_children(element).trim();
            },
            '#comment': function(element) {},
            'define-node': function(element) {
                var definition_name = nodp.get_evaluated_argument(element, 0);
                nodp.define_node(definition_name, nodp.get_unevaluated_argument(element, 1));
                return definition_name;
            },
            'define-attribute': function(element) {
                var definition_name = nodp.get_evaluated_argument(element, 0);
                nodp.define_attribute(definition_name, nodp.get_unevaluated_argument(element, 1));
                return definition_name;
            },
            'define-variable': function(element) {
            	if(element.children.length>1)
                	return node_scope.previous.scope_variables[nodp.get_evaluated_argument(element, 0)] = nodp.get_evaluated_argument(element, 1);
                else return node_scope.previous.scope_variables[nodp.make_string_from_children(element)] = null;

            },
            'generate-unique-name': function(element) {
                prefix = nodp.make_string_from_children(element);
                prefix = prefix ? prefix : '_';
                return prefix + Math.random().toString(36).substr(2, 9);
            },
            'set-variable': function(element) {
                return nodp.set_variable(nodp.get_evaluated_argument(element, 0), nodp.get_evaluated_argument(element, 1));
            },
            'get-variable': function(element) {
                return nodp.get_variable(nodp.make_string_from_children(element));
            },
            'make-string-from-children': function(element) {
                return nodp.make_string_from_children(nodp.get_evaluated_argument(element, 0));
            },
            'is-variable-set': function(element) {
                return nodp.is_variable_set(nodp.make_string_from_children(element));
            },
            'evaluate-node': function(element) {
                return nodp.apply_evaluation(nodp.get_evaluated_argument(element, 0));
            }, //Using create element and add children you can evaluate on the fly
            'create-node': function(element) {
                var node = nodp.make_string_from_children(element);
                //if(safe_mode && node.toLowerCase() == 'script') throw "Blocked attempt to create script element. turn safe mode off"
                return document.createElement(node);
            },
            'insert-adjacent-element': function(element) {
                return nodp.get_evaluated_argument(element, 0).insertAdjacentElement(nodp.get_evaluated_argument(element, 1), nodp.get_evaluated_argument(element, 2));
            },
            'prepend-children': function(element) {
                var parent = nodp.get_evaluated_argument(element, 0);
                for (var i = 1; i < element.children.length; i++) {
                    parent.prepend(nodp.get_evaluated_argument(element, i));
                }
                return parent
            },
            'append-children': function(element) {
                var parent = nodp.get_evaluated_argument(element, 0);
                for (var i = 1; i < element.children.length; i++) {
                    parent.appendChild(nodp.get_evaluated_argument(element, i));
                }
                return parent
            },
            'remove-node': function(element) {
                return nodp.get_evaluated_argument(element, 0).remove();
            },
            'clone-node': function(element) {
                return nodp.get_evaluated_argument(element, 0).cloneNode(true);
            },
            'replace-node': function(element) {
                return nodp.get_evaluated_argument(element, 0).replaceWith(nodp.get_evaluated_argument(element, 1))
            },
            'get-children': function(element) {
                return nodp.get_evaluated_argument(element, 0).children;
            },
            'offset-scope': function(element) {
                var offset = Number(nodp.make_string_from_children(element)) + 1;
                var temporary_offset = node_scope;
                for (var i = 0; i < offset; i++) {
                    if (temporary_offset['previous'] && temporary_offset['previous']['element']) {
                        temporary_offset = temporary_offset['previous'];
                    } else throw "Offset out of bounds";
                }
                return temporary_offset.element;
            },
            'unwind-scope': function(element) {
                var offset = Number(nodp.get_evaluated_argument(element, 0));
                var temporary_offset = node_scope;
                for (var i = 0; i < offset; i++) {
                    if (temporary_offset['previous'] && temporary_offset['previous']['element']) {
                        temporary_offset = temporary_offset['previous'];
                    } else throw "Offset out of bounds";
                }
                actual_node_scope = node_scope;
                node_scope = temporary_offset
                var last = nodp.evaluate_all_children(element, 1);
                node_scope = actual_node_scope;
                return last;
            },

            'rewind-scope': function(element) {

                var unwinded_node_scope = node_scope;
                node_scope = actual_node_scope
                var last = nodp.evaluate_all_children(element);
                node_scope = unwinded_node_scope;
                return last;
            },
            'error': function(element) {
                throw nodp.make_string_from_children(element);
            },
            'get-node-definition': function(element) {
                return nodes_table[nodp.make_string_from_children(element).toUpperCase()]
            },
            'get-attribute-definition': function(element) {
                return attributes_table[nodp.make_string_from_children(element).toUpperCase()];
            },
            'identity': function(element) {
                return nodp.get_unevaluated_argument(element, 0);
            },
            'get-inner-text': function(element) {
                return nodp.get_evaluated_argument(element, 0).innerHTML;
            },
            'get-value': function(element) {
                return nodp.get_evaluated_argument(element, 0).value;
            },
            'set-value': function(element) {
                return nodp.get_evaluated_argument(element, 0).value = nodp.get_evaluated_argument(element, 1);
            },
            'get-outer-text': function(element) {
                return nodp.get_evaluated_argument(element, 0).outerHTML;
            },
            'get-node-name': function(element) {
                return nodp.get_evaluated_argument(element, 0).nodeName;
            },
            'assert': function(element) {
                var bool = nodp.get_evaluated_argument(element, 0);
                if (!bool) throw "Assertion failed, got " + bool;
                return true;
            },
            'set-node-inner-to-text': function(element) {
                return nodp.get_evaluated_argument(element, 0).innerHTML = nodp.get_evaluated_argument(element, 1);
            },
            'set-node-to-text': function(element) {
                return nodp.get_evaluated_argument(element, 0).outerHTML = nodp.get_evaluated_argument(element, 1);
            },
            'get-first-child': function(element) {
                var results = get_children(element);
                return results.length > 0 ? results[0] : null;
            },
            'get-nth-child': function(element) {
                var results = nodp.get_evaluated_argument(element, 0).children;
                var nth = nodp.get_evaluated_argument(element, 1);
                if (results.length > (nth - 1)) return results[nth];
            },
            'remove-attribute': function(element) {
                return nodp.get_evaluated_argument(element, 0).removeAttribute(nodp.get_evaluated_argument(element, 1))
            },
            'get-attribute': function(element) {
                return nodp.get_evaluated_argument(element, 0).getAttribute(nodp.get_evaluated_argument(element, 1));
            },
            'get-all-attribute': function(element) {
                return nodp.get_evaluated_argument(element, 0).attributes;
            },
            'set-attribute': function(element) {
                return nodp.get_evaluated_argument(element, 0).setAttribute(nodp.get_evaluated_argument(element, 1), nodp.get_evaluated_argument(element, 2))
            },
            'weak-equal': function(element) {
                for (var i = 0; i < element.children.length - 1; i++) {
                    if (nodp.get_evaluated_argument(element, i) != nodp.get_evaluated_argument(element, i + 1))
                        return false
                }
                return true;
            },
            'strong-equal': function(element) {
                for (var i = 0; i < element.children.length - 1; i++) {
                    if (nodp.get_evaluated_argument(element, i) !== nodp.get_evaluated_argument(element, i + 1))
                        return false
                }
                return true;
            },
            'if': function(element) {
                if (nodp.get_evaluated_argument(element, 0)) return nodp.get_evaluated_argument(element, 1);
                else if (element.children.length > 2) return nodp.get_evaluated_argument(element, 2);
                return null;
            },
            'number': function(element) {
                return Number(nodp.make_string_from_children(element));
            },
            'add': function(element) {
                var result = 0;
                for (var i = 0; i < element.children.length; i++) {
                    result += Number(nodp.get_evaluated_argument(element, i))
                }
                return result;
            },
            'modulo': function(element) {
                return Number(nodp.get_evaluated_argument(element, 0) % nodp.get_evaluated_argument(element, 1));
            },
            'multiply': function(element) {
                var result = 0;
                for (var i = 0; i < element.children.length; i++) {
                    result *= Number(nodp.get_evaluated_argument(element, i))
                }
                return result;
            },
            'subtract': function(element) {
                return Number(nodp.get_evaluated_argument(element, 0)) - Number(nodp.get_evaluated_argument(element, 1));
            },
            'divide': function(element) {
                return Number(nodp.get_evaluated_argument(element, 0)) / Number(nodp.get_evaluated_argument(element, 1));
            },
            'absolute-value': function(element) {
                return Math.abs(Number(nodp.get_evaluated_argument(element, 0)));
            },
            'and': function(element) {
                var result = true;
                for (var i = 0; i < element.children.length; i++) {
                    result = result && nodp.get_evaluated_argument(element, i);
                    if (!result) break;
                }
                return result;
            },
            'or': function(element) {
                var result = false;
                for (var i = 0; i < element.children.length; i++) {
                    result = result || nodp.get_evaluated_argument(element, i);
                    if (result) break;
                }
                return result;
            },
            'not': function(element) {
                return nodp.get_evaluated_argument(element, 0) ? false : true;
            },
            'greater-than': function(element) {
                return nodp.get_evaluated_argument(element, 0) > nodp.get_evaluated_argument(element, 1)
            },
            'greater-or-equal-to': function(element) {
                return nodp.get_evaluated_argument(element, 0) >= nodp.get_evaluated_argument(element, 1)
            },
            'smaller-than': function(element) {
                return nodp.get_evaluated_argument(element, 0) < nodp.get_evaluated_argument(element, 1)
            },
            'smaller-or-equal-to': function(element) {
                return nodp.get_evaluated_argument(element, 0) <= nodp.get_evaluated_argument(element, 1)
            },
            'boolean': function(element) {
                return stringToBoolean(nodp.make_string_from_children(element));
            },
            'string': function(element) {
                if (element.innerHTML) return element.innerHTML;
                return element.toString();
            },
            'first-node-from-string': function(element) {
                return htmlToElement(nodp.make_string_from_children(element));
            },
            'object-from-json': function(element) {
                return JSON.parse(nodp.make_string_from_children(element));
            },
            'length': function(element) {
                var evaled = nodp.get_evaluated_argument(element, 0);
                if (evaled.length) return evaled.length;
                return -1;
            },
            'get-element-by-id': function(element) {
                return document.getElementById(nodp.make_string_from_children(element))
            },
            'get-elements-by-selector': function(element) {
                return document.querySelectorAll(nodp.make_string_from_children(element))
            },
            'sleep': async function(element) {
                await new Promise(r => setTimeout(r, nodp.get_evaluated_argument(element, 0)));
                return nodp.get_evaluated_argument(element, 1)
            },
            'get-reference': function(element) {
                return nodp.get_evaluated_argument(element, 0)[nodp.get_evaluated_argument(element, 1)]
            },
            'set-reference': function(element) {
                return nodp.get_evaluated_argument(element, 0)[nodp.get_evaluated_argument(element, 1)] = nodp.get_evaluated_argument(element, 2);
            },
            'make-array': function(element) {
                var arr = [];
                if (element.children.length > 0) { nodp.set_variable(nodp.make_string_from_children(element), arr); }
                return arr;
            },
            'make-dictionary': function(element) {
                var dict = {};
                if (element.children.length > 0) { nodp.set_variable(nodp.make_string_from_children(element), dict); }
                return dict;
            },
            'import-package': async function(element) {
                var package = nodp.make_string_from_children(element)
                if(imported_packages.includes(package))return;
                imported_packages.push(package);
                                            
                let response = await fetch(package);
                let status_code = await response.status
                response = await response.text()
                if(status_code ==200)
                	nodp.apply_evaluation(htmlToElement(response));
                else throw "got code "+status_code+" while trying to import "+package;


            },
            'import-extension': async function(element) {
                var extension =  nodp.make_string_from_children(element);
                if(imported_extensions.includes(extension))return;
                imported_extensions.push(extension);
                let response = await fetch(extension);
                let status_code = await response.status
                response = await response.text()
                if(status_code ==200)
                	(new Function("nodp", response))(nodp);
                else throw "got code "+status_code+" while trying to import "+extension;

            },
            'push-to-array': function(element) {
                return nodp.get_evaluated_argument(element, 0).push(nodp.get_evaluated_argument(element, 1))
            },
            'pop-array': function(element) {
                return nodp.get_evaluated_argument(element, 0).pop()
            },
            'string-trim': function(element) {
                return nodp.make_string_from_children(element).trim();
            },
            'to-upper-case': function(element) {
                return nodp.make_string_from_children(element).toUpperCase();
            },
            'to-lower-case': function(element) {
                return nodp.make_string_from_children(element).toLowerCase();
            },
            'string-index-of': function(element) {
                return nodp.get_evaluated_argument(element, 0).toString().indexOf(nodp.get_evaluated_argument(element, 1))
            },
            'string-replace': function(element) {
                return nodp.get_evaluated_argument(element, 0).toString().replace(nodp.get_evaluated_argument(element, 1), nodp.get_evaluated_argument(element, 2))
            },
            'regular-expression': function(element) {
                return new RegExp(nodp.make_string_from_children(element));
            },
            'string-split': function(element) {
                return nodp.get_evaluated_argument(element, 0).toString().split(nodp.get_evaluated_argument(element, 1))
            },
            'slice': function(element) {
                return element.children.length > 2 ? nodp.get_evaluated_argument(element, 0).slice(nodp.get_evaluated_argument(element, 1), nodp.get_evaluated_argument(element, 2)) :
                    nodp.get_evaluated_argument(element, 0).slice(nodp.get_evaluated_argument(element, 1))
            },
            'while': function(element) {
                while (nodp.get_evaluated_argument(element, 0)) { nodp.get_evaluated_argument(element, 1) };
                return null
            },
            'for-in': function(element) {
                var arr = nodp.get_evaluated_argument(element, 1);
                for (const value in arr) {
                    node_scope.previous.scope_variables[nodp.get_evaluated_argument(element, 0)] = value;
                    nodp.get_evaluated_argument(element, 2);
                }
                return null
            },
            'for-of': function(element) {
                var arr = nodp.get_evaluated_argument(element, 1);
                if (arr == null || typeof arr[Symbol.iterator] !== 'function') return null;
                for (const value of arr) {
                    node_scope.previous.scope_variables[nodp.get_evaluated_argument(element, 0)] = value;
                    nodp.get_evaluated_argument(element, 2);
                }
                return null
            },
            'add-event-listener': function(element) {
                return nodp.get_evaluated_argument(element, 0).addEventListener(nodp.get_evaluated_argument(element, 1).toString(),
                    function(e) {
                        var event_id = ++event_counter;
                        events_store[event_id] = e;
                        nodp.get_unevaluated_argument(element, 2).setAttribute('event-id', event_id);
                        nodp.get_evaluated_argument(element, 2);
                        delete events_store[event_id];
                    });
            },
            'get-event': function(element) {
                return events_store[Number(nodp.get_evaluated_argument(element, 0))]
            },
            'make-event': function(element) {
                var event_name = nodp.get_evaluated_argument(element, 0);
                var event_details = element.children.length > 1 ? nodp.get_evaluated_argument(element, 1) : null;
                return new CustomEvent(event_name, { detail: event_details });
            },
            'dispatch-event': function(element) {
                return nodp.get_evaluated_argument(element, 0).dispatchEvent(nodp.get_evaluated_argument(element, 1));
            },



        }

        Object.keys(base_functions).forEach(function(key) {
            nodp.define_node(key, base_functions[key]);
        });
    }
    this.start = async function(head) { //maybe later make nodp a class 
        //scan        //add basic nodes and attributes required to do something
        addBaseNodes(head);
        addBaseAttributes(head)

        var top_definitions = ['import-extension','import-package' , 'define-attribute', 'define-node'];//
        try {
            // before executing, add all definitions to the table
            for (var i = 0; i < top_definitions.length; i++) {

                var definitions = document.querySelectorAll('#' + head.id + ' > ' + top_definitions[i]);
                for (var j = 0; j < definitions.length; j++) {
                   await nodp.apply_evaluation(definitions[j])
                }
            }



            //start execution
            nodp.apply_evaluation(head);
        } catch (execption) {
            nodp.error(execption)
        }
    }

    nodp.start(head)

}