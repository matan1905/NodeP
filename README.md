# NodeP

HTML / XML based syntax is a programming language.
it was made mainly as a reason to add "Can program in HTML" 
into my CV, but continued because it's actually fun to program it and in it.

Highly inspired by Lisp's "code as data type", which means you can manipulate the code in all directions while it's still executing.



## Getting Started

For information about NodeP, it's syntax,nodes and attributes, checkout [The wiki](https://github.com/matan1905/NodeP/wiki)

You can also checkout the [examples page](https://github.com/matan1905/NodeP/tree/master/examples) 
### Playground
You can go to the [REPL](https://matan1905.github.io/NodeP/examples/repl.html) and play around with it!
try typing in 
```html
<print>Hey you!</print>
```
and see what happens!

if you are more adventurous, you could try rewriting the REPL itself from within itself!
### Adding NodeP to a website

Start by including the following script tag to the HTML:
```html
<script src="https://matan1905.github.io/NodeP/script.js"></script>
```

now add your NodeP code into the page
```html
<begin hidden id="Nodep">
	<print>Hello world!</print>
</begin>
```
make sure to add "hidden" attribute to prevent the page from displaying all text inside tags.

finally, call the script that will execute the passed NodeP code after the page fully loads
```html
 <body onload="loaded()">
 <script>
	function loaded() { 
		//All it takes is creating the object Nodep with 
		//the element you want it to evaluate.
		new Nodep(document.getElementById('Nodep'));
	}
</script>
```
#### Full Hello world html example
```html
<!DOCTYPE html>
<html>
<head>
	<title>Hello world example</title>
</head>
<body onload="loaded()">
    <script src="https://matan1905.github.io/NodeP/script.js"></script>
    <script>
        function loaded(){
        n =new Nodep(document.getElementById('Nodep'));}
	</script>
    <begin hidden id="Nodep">
	     <print>Hello world!</print>
    </begin>
</body>
</html>
```
"Hello world!" should be printed in the javascript console.


## License

This project is licensed under the MIT License.
