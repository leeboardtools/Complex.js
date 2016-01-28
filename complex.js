/**
 * @license Complex.js v1.5.0 13/07/2015
 *
 * Copyright (c) 2015, Robert Eisele (robert@xarg.org)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 **/

/**
 *
 * This class allows the manipilation of complex numbers.
 * You can pass a complex number in different formats. Either as object, double, string or two integer parameters.
 *
 * Object form
 * { re: <real>, im: <imaginary> }
 * { arg: <angle>, abs: <radius> }
 * { phi: <angle>, r: <radius> }
 *
 * Double form
 * 99.3 - Single double value
 *
 * String form
 * "23.1337" - Simple real number
 * "15+3i" - a simple complex number
 * "3-i" - a simple complex number
 *
 * Example:
 *
 * var c = new Complex("99.3+8i");
 * c.mul({r: 3, i: 9}).div(4.9).sub(3, 2);
 *
 */

(function(root) {

    "use strict";

    /**
     * Comparision epsilon
     *
     * @const
     * @type Number
     */
    var EPSILON = 1e-16;

    var P = {r: 0, i: 0};

    // Heaviside-Function
    var heaviside = function(x) {
        return x < 0 ? -1 : 1;
    };

    Math.cosh = Math.cosh || function(x) {
        return (Math.exp(x) + Math.exp(-x)) * 0.5;
    };

    Math.sinh = Math.sinh || function(x) {
        return (Math.exp(x) - Math.exp(-x)) * 0.5;
    };

    var parser_exit = function() {
        throw "Invalid Param";
    };

    /**
     * Calculates log(sqrt(a^2+b^2)) in a way to avoid overflows
     * 
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    function logsq2(a, b) {
        
        var _a = Math.abs(a);
        var _b = Math.abs(b);
        
        if (a === 0) {
            return Math.log(_b);
        }
        
        if (b === 0) {
            return Math.log(_a);
        }

        if (_a < 1000 && _b < 1000) {
            return Math.log(a * a + b * b) * 0.5;
        }
        
        /* I got 4 ideas to compute this property without overflow:
         * 
         * Testing 1000000 times with random samples for a,b ∈ [1, 1000000000] against a big decimal library to get an error estimate
         * 
         * 1. Only eliminate the square root: (OVERALL ERROR: 3.9122483030951116e-11)
         
         Math.log(a * a + b * b) / 2
        
         * 
         * 
         * 2. Try to use the non-overflowing pythagoras: (OVERALL ERROR: 8.889760039210159e-10)

        var fn = function(a, b) {
            a = Math.abs(a);
            b = Math.abs(b);
            var t = Math.min(a, b);
            a = Math.max(a, b);
            t = t / a;

            return Math.log(a) + Math.log(1 + t * t) / 2;
        };

         * 3. Abuse the identity cos(atan(y/x) = x / sqrt(x^2+y^2): (OVERALL ERROR: 3.4780178737037204e-10)

         Math.log(a / Math.cos(Math.atan2(b, a)))
        
        * 4. Use 3. and apply log rules: (OVERALL ERROR: 1.2014087502620896e-9)

        Math.log(a) - Math.log(Math.cos(Math.atan2(b, a)))

        */

        return Math.log(a / Math.cos(Math.atan2(b, a)));
    }

    var parse = function(a, b) {

        if (a === null || a === undefined) {
            P["re"] = 0;
            P["im"] = 0;
        } else if (b !== undefined) {
            P["re"] = a;
            P["im"] = b;
        } else
            switch (typeof a) {

                case "object":

                    if ("im" in a && "re" in a) {
                        P["re"] = (a["re"]);
                        P["im"] = (a["im"]);
                    } else if ("abs" in a && "arg" in a) {
                        P["re"] = a["abs"] * Math.cos(a["arg"]);
                        P["im"] = a["abs"] * Math.sin(a["arg"]);
                    } else {
                        parser_exit();
                    }
                    break;

                case "string":

                    P["im"] = /* void */
                    P["re"] = 0;

                    for (var reg = /[+-]?(?:[\di.]e[+-]?[\di]+|[\di.]+)/ig, tmp, tr, i = 0; null !== (tmp = reg.exec(a)); i = 1) {

                        if (tmp[0].indexOf("i") !== -1) {

                            tr = tmp[0].replace("i", "");
                            if (tr === "+" || tr === "-" || tr === "")
                                tr+= "1";

                            P["im"]+= parseFloat(tr);
                        } else {
                            P["re"]+= parseFloat(tmp[0]);
                        }
                    }

                    // No single iteration
                    if (i === 0) {
                        parser_exit();
                    }
                    break;

                case "number":
                    P["im"] = 0;
                    P["re"] = a;
                    break;

                default:
                    parser_exit();
            }

        if (isNaN(P["re"] * P["im"])) {
            parser_exit();
        }
    };

    /**
     * @constructor
     * @returns {Complex}
     */
    function Complex(a, b) {

        if (!(this instanceof Complex)) {
            return new Complex(a, b);
        }

        parse(a, b);

        this["re"] = P["re"];
        this["im"] = P["im"];
    }

    Complex.prototype = {
        
        "re": 0,
        "im": 0,
        
        /**
         * Calculates the sign of a complex number
         * 
         * @returns {Complex}
         */
        "sign": function() {
            
            // Doesn't overflow
            
            var abs = this["abs"]();
            return new Complex(this["re"] / abs, this["im"] / abs);
        },
        
        /**
         * Adds two complex numbers
         *
         * @returns {Complex}
         */
        "add": function(a, b) {

            // Doesn't overflow
            parse(a, b);

            return new Complex(
                    this["re"] + P["re"],
                    this["im"] + P["im"]
                    );
        },
        
        /**
         * Subtracts two complex numbers
         *
         * @returns {Complex}
         */
        "sub": function(a, b) {

            // Doesn't overflow
            parse(a, b);

            return new Complex(
                    this["re"] - P["re"],
                    this["im"] - P["im"]
                    );
        },
        
        /**
         * Multiplies two complex numbers
         *
         * @returns {Complex}
         */
        "mul": function(a, b) {

            // Todo: is there a way r*r doesn't overflow?
            parse(a, b);

            return new Complex(
                    this["re"] * P["re"] - this["im"] * P["im"],
                    this["re"] * P["im"] + this["im"] * P["re"]
                    );
        },
        
        /**
         * Divides two complex numbers
         *
         * @returns {Complex}
         */
        "div": function(a, b) {

            // Doesn't overflow
            parse(a, b);

            a = this["re"];
            b = this["im"];

            var c = P["re"];
            var d = P["im"];
            var t, x;

            if (0 === c && 0 === d) {
                throw "DIV/0";
            }

            if (Math.abs(c) < Math.abs(d)) {
                x = c / d;
                t = c * x + d;

                return new Complex(
                        (a * x + b) / t,
                        (b * x - a) / t);
            }

            x = d / c;
            t = d * x + c;

            return new Complex(
                    (a + b * x) / t,
                    (b - a * x) / t);
        },
        
        /**
         * Calculate the power of two complex numbers
         *
         * @returns {Complex}
         */
        "pow": function(a, b) {

            // Doesn't overflow
            parse(a, b);

            a = this["re"];
            b = this["im"];

            if (a === 0 && b === 0) {
                return new Complex(0, 0);
            }

            var arg = Math.atan2(b, a);
            var log = logsq2(a, b);

            if (P["im"] === 0) {
                
                if (b === 0 && a >= 0) {

                    return new Complex(Math.pow(a, P["re"]), 0);

                } else if (a === 0) {
                    
                    switch (P["re"] % 4) {
                        case 0:
                            return new Complex(Math.pow(b, P["re"]), 0);
                        case 1:
                            return new Complex(0, Math.pow(b, P["re"]));
                        case 2:
                            return new Complex(-Math.pow(b, P["re"]), 0);
                        case 3:
                            return new Complex(0, -Math.pow(b, P["re"]));
                    }
                }
            }

            /* I couldn't find a good formula, so here is a derivation and optimization
             * 
             * z_1^z_2 = (a + bi)^(c + di)
             *         = exp((c + di) * log(a + bi)
             *         = pow(a^2 + b^2, (c + di) / 2) * exp(i(c + di)atan2(b, a))
             * =>...
             * Re = (pow(a^2 + b^2, c / 2) * exp(-d * atan2(b, a))) * cos(d * log(a^2 + b^2) / 2 + c * atan2(b, a))
             * Im = (pow(a^2 + b^2, c / 2) * exp(-d * atan2(b, a))) * sin(d * log(a^2 + b^2) / 2 + c * atan2(b, a))
             * 
             * =>...
             * Re = exp(c * log(sqrt(a^2 + b^2)) - d * atan2(b, a)) * cos(d * log(sqrt(a^2 + b^2)) + c * atan2(b, a))
             * Im = exp(c * log(sqrt(a^2 + b^2)) - d * atan2(b, a)) * sin(d * log(sqrt(a^2 + b^2)) + c * atan2(b, a))
             * 
             * =>
             * Re = exp(c * logsq2 - d * arg(z_1)) * cos(d * logsq2 + c * arg(z_1))
             * Im = exp(c * logsq2 - d * arg(z_1)) * sin(d * logsq2 + c * arg(z_1))
             * 
             */

            a = Math.exp(P["re"] * log - P["im"] * arg);
            b = P["im"] * log + P["re"] * arg;

            return new Complex(
                    a * Math.cos(b),
                    a * Math.sin(b)
                    );
        },
        
        /**
         * Calculate the complex square root
         *
         * @returns {Complex}
         */
        "sqrt": function() {

            // Doesn't overflow
            var r = this["abs"]();

            return new Complex(
                    Math.sqrt((r + this["re"]) * 0.5),
                    Math.sqrt((r - this["re"]) * 0.5) * heaviside(this["im"])
                    );
        },
        
        /**
         * Calculate the complex exponent
         *
         * @returns {Complex}
         */
        "exp": function() {

            // Doesn't overflow, only exp(r) can become too large...
            var tmp = Math.exp(this["re"]);

            return new Complex(
                    tmp * Math.cos(this["im"]),
                    tmp * Math.sin(this["im"]));
        },
        
        /**
         * Calculate the natural log
         *
         * @returns {Complex}
         */
        "log": function() {

            var a = this["re"];
            var b = this["im"];

            // Doesn't overflow
            return new Complex(
                    logsq2(a, b),
                    Math.atan2(b, a));
        },
        
        /**
         * Calculate the magniture of the complex number
         *
         * @returns {number}
         */
        "abs": function() {

            // Doesn't overflow

            var a = Math.abs(this["re"]);
            var b = Math.abs(this["im"]);

            if (a < 1000 && b < 1000) {
                return Math.sqrt(a * a + b * b);
            }

            if (a < b) {
                a = b;
                b = this["re"] / this["im"];
            } else {
                b = this["im"] / this["re"];
            }
            return a * Math.sqrt(1 + b * b);
        },
        
        /**
         * Calculate the angle of the complex number
         *
         * @returns {number}
         */
        "arg": function() {
            
            // Doesn't overflow

            return Math.atan2(this["im"], this["re"]);
        },
        
        /**
         * Calculate the sine of the complex number
         *
         * @returns {Complex}
         */
        "sin": function() {
            
            // Doesn't overflow

            var a = this["re"];
            var b = this["im"];

            return new Complex(
                    Math.sin(a) * Math.cosh(b),
                    Math.cos(a) * Math.sinh(b)
                    );
        },
        
        /**
         * Calculate the cosine
         *
         * @returns {Complex}
         */
        "cos": function() {
            
            // Doesn't overflow

            var a = this["re"];
            var b = this["im"];

            return new Complex(
                    Math.cos(a) * Math.cosh(b),
                    -Math.sin(a) * Math.sinh(b)
                    );
        },
        
        /**
         * Calculate the tangent
         *
         * @returns {Complex}
         */
        "tan": function() {
            
            // Doesn't overflow

            var a = this["re"];
            var b = this["im"];

            var d = Math.cos(2 * a) + Math.cosh(2 * b);

            return new Complex(
                    Math.sin(2 * a) / d,
                    Math.sinh(2 * b) / d
                    );
        },
        
        /**
         * Calculate the complex arcus sinus
         *
         * @returns {Complex}
         */
        "asin": function() {

            return this["mul"](this)["neg"]()["add"](1)["sqrt"]()
                    ["add"](this["mul"](Complex["I"]))["log"]()["mul"](Complex["I"])["neg"]();
        },
        
        /**
         * Calculate the complex arcus cosinus
         *
         * @returns {Complex}
         */
        "acos": function() {

            return this["mul"](this)["neg"]()["add"](1)["sqrt"]()
                    ["mul"](Complex["I"])["add"](this)["log"]()["mul"](Complex["I"])["neg"]();
        },
        
        /**
         * Calculate the complex arcus tangent
         *
         * @returns {Complex}
         */
        "atan": function() {

            return Complex["I"]["add"](this)["div"](Complex["I"]["sub"](this))
                    ["log"]()["mul"](Complex["I"])["div"](2);
        },
        
        /**
         * Calculate the complex sinh
         *
         * @returns {Complex}
         */
        "sinh": function() {
            
            // Doesn't overflow

            var a = this["re"];
            var b = this["im"];

            return new Complex(
                    Math.sinh(a) * Math.cos(b),
                    Math.cosh(a) * Math.sin(b)
                    );
        },
        
        /**
         * Calculate the complex cosh
         *
         * @returns {Complex}
         */
        "cosh": function() {
            
            // Doesn't overflow

            var a = this["re"];
            var b = this["im"];

            return new Complex(
                    Math.cosh(a) * Math.cos(b),
                    Math.sinh(a) * Math.sin(b)
                    );
        },
        
        /**
         * Calculate the complex tanh
         *
         * @returns {Complex}
         */
        "tanh": function() {
            
            // Doesn't overflow

            var a = this["re"];
            var b = this["im"];

            var d = Math.cosh(2 * a) + Math.cos(2 * b);

            return new Complex(
                    Math.sinh(2 * a) / d,
                    Math.sin(2 * b) / d
                    );
        },
        
        /**
         * Calculate the complex inverse 1/z
         *
         * @returns {Complex}
         */
        "inverse": function() {

            var a = this["re"];
            var b = this["im"];

            var t = a * a + b * b;

            if (0 === t) {
                throw "DIV/0";
            }
            return new Complex(a / t, -b / t);
        },
        
        /**
         * Returns the complex conjugate
         *
         * @returns {Complex}
         */
        "conjugate": function() {
            
            // Doesn't overflow

            return new Complex(this["re"], -this["im"]);
        },
        
        /**
         * Gets the negated complex number
         *
         * @returns {Complex}
         */
        "neg": function() {
            
            // Doesn't overflow
            
            return new Complex(-this["re"], -this["im"]);
        },
        
        /**
         * Ceils the actual complex number
         * 
         * @returns {Complex}
         */
        "ceil": function(places) {
            
            // Doesn't overflow
            
            places = Math.pow(10, places || 0);
            
            return new Complex(Math.ceil(this["re"] * places) / places, Math.ceil(this["im"] * places) / places);
        },
        
        /**
         * Floors the actual complex number
         * 
         * @returns {Complex}
         */
        "floor": function(places) {
            
            // Doesn't overflow
            
            places = Math.pow(10, places || 0);
            
            return new Complex(Math.floor(this["re"] * places) / places, Math.floor(this["im"] * places) / places);
        },
        
        /**
         * Ceils the actual complex number
         * 
         * @returns {Complex}
         */
        "round": function(places) {
            
            // Doesn't overflow
            
            places = Math.pow(10, places || 0);
            
            return new Complex(Math.round(this["re"] * places) / places, Math.round(this["im"] * places) / places);
        },
        
        /**
         * Compares two complex numbers
         *
         * @returns {boolean}
         */
        "equals": function(a, b) {
            
            // Doesn't overflow

            parse(a, b);

            return Math.abs(P["re"] - this["re"]) <= EPSILON && Math.abs(P["im"] - this["im"]) <= EPSILON;
        },
        
        /**
         * Clones the actual object
         *
         * @returns {Complex}
         */
        "clone": function() {
            
            // Doesn't overflow

            return new Complex(this["re"], this["im"]);
        },
        
        /**
         * Gets a string of the actual complex number
         *
         * @returns {String}
         */
        "toString": function() {

            var a = this["re"];
            var b = this["im"];
            var ret = "";
            
            if (isNaN(a * b)) {
                return "NaN";
            }

            if (a !== 0) {
                ret += a;
            }

            if (b !== 0) {

                if (b > 0 && a !== 0)
                    ret += "+";

                if (b === -1) {
                    ret += "-";
                } else if (b !== 1) {
                    ret += b;
                }
                ret += "i";
            }

            if (!ret)
                return "0";

            return ret;
        },
        
        /**
         * Returns the actual number as a vector
         *
         * @returns {Array}
         */
        "toVector": function() {

            return [this["re"], this["im"]];
        },
        
        /**
         * Returns the actual real value of the current object
         *
         * @returns {number|null}
         */
        "valueOf": function() {

            if (this["im"] === 0) {
                return this["re"];
            }
            return null;
        }
    };

    Complex["ZERO"] = new Complex;
    Complex["ONE"] = new Complex(1, 0);
    Complex["I"] = new Complex(0, 1);
    Complex["PI"] = new Complex(Math.PI, 0);
    Complex["E"] = new Complex(Math.E, 0);

    if (typeof define === "function" && define["amd"]) {
        define([], function() {
            return Complex;
        });
    } else if (typeof exports === "object") {
        module["exports"] = Complex;
    } else {
        root["Complex"] = Complex;
    }

})(this);
