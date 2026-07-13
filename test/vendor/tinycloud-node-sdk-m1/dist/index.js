var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../node_modules/bn.js/lib/bn.js
var require_bn = __commonJS({
  "../../node_modules/bn.js/lib/bn.js"(exports, module) {
    "use strict";
    (function(module2, exports2) {
      "use strict";
      function assert2(val, msg) {
        if (!val) throw new Error(msg || "Assertion failed");
      }
      function inherits(ctor, superCtor) {
        ctor.super_ = superCtor;
        var TempCtor = function() {
        };
        TempCtor.prototype = superCtor.prototype;
        ctor.prototype = new TempCtor();
        ctor.prototype.constructor = ctor;
      }
      function BN3(number, base2, endian) {
        if (BN3.isBN(number)) {
          return number;
        }
        this.negative = 0;
        this.words = null;
        this.length = 0;
        this.red = null;
        if (number !== null) {
          if (base2 === "le" || base2 === "be") {
            endian = base2;
            base2 = 10;
          }
          this._init(number || 0, base2 || 10, endian || "be");
        }
      }
      if (typeof module2 === "object") {
        module2.exports = BN3;
      } else {
        exports2.BN = BN3;
      }
      BN3.BN = BN3;
      BN3.wordSize = 26;
      var Buffer2;
      try {
        if (typeof window !== "undefined" && typeof window.Buffer !== "undefined") {
          Buffer2 = window.Buffer;
        } else {
          Buffer2 = __require("buffer").Buffer;
        }
      } catch (e) {
      }
      BN3.isBN = function isBN(num) {
        if (num instanceof BN3) {
          return true;
        }
        return num !== null && typeof num === "object" && num.constructor.wordSize === BN3.wordSize && Array.isArray(num.words);
      };
      BN3.max = function max(left, right) {
        if (left.cmp(right) > 0) return left;
        return right;
      };
      BN3.min = function min(left, right) {
        if (left.cmp(right) < 0) return left;
        return right;
      };
      BN3.prototype._init = function init2(number, base2, endian) {
        if (typeof number === "number") {
          return this._initNumber(number, base2, endian);
        }
        if (typeof number === "object") {
          return this._initArray(number, base2, endian);
        }
        if (base2 === "hex") {
          base2 = 16;
        }
        assert2(base2 === (base2 | 0) && base2 >= 2 && base2 <= 36);
        number = number.toString().replace(/\s+/g, "");
        var start = 0;
        if (number[0] === "-") {
          start++;
          this.negative = 1;
        }
        if (start < number.length) {
          if (base2 === 16) {
            this._parseHex(number, start, endian);
          } else {
            this._parseBase(number, base2, start);
            if (endian === "le") {
              this._initArray(this.toArray(), base2, endian);
            }
          }
        }
      };
      BN3.prototype._initNumber = function _initNumber(number, base2, endian) {
        if (number < 0) {
          this.negative = 1;
          number = -number;
        }
        if (number < 67108864) {
          this.words = [number & 67108863];
          this.length = 1;
        } else if (number < 4503599627370496) {
          this.words = [
            number & 67108863,
            number / 67108864 & 67108863
          ];
          this.length = 2;
        } else {
          assert2(number < 9007199254740992);
          this.words = [
            number & 67108863,
            number / 67108864 & 67108863,
            1
          ];
          this.length = 3;
        }
        if (endian !== "le") return;
        this._initArray(this.toArray(), base2, endian);
      };
      BN3.prototype._initArray = function _initArray(number, base2, endian) {
        assert2(typeof number.length === "number");
        if (number.length <= 0) {
          this.words = [0];
          this.length = 1;
          return this;
        }
        this.length = Math.ceil(number.length / 3);
        this.words = new Array(this.length);
        for (var i = 0; i < this.length; i++) {
          this.words[i] = 0;
        }
        var j, w;
        var off = 0;
        if (endian === "be") {
          for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
            w = number[i] | number[i - 1] << 8 | number[i - 2] << 16;
            this.words[j] |= w << off & 67108863;
            this.words[j + 1] = w >>> 26 - off & 67108863;
            off += 24;
            if (off >= 26) {
              off -= 26;
              j++;
            }
          }
        } else if (endian === "le") {
          for (i = 0, j = 0; i < number.length; i += 3) {
            w = number[i] | number[i + 1] << 8 | number[i + 2] << 16;
            this.words[j] |= w << off & 67108863;
            this.words[j + 1] = w >>> 26 - off & 67108863;
            off += 24;
            if (off >= 26) {
              off -= 26;
              j++;
            }
          }
        }
        return this._strip();
      };
      function parseHex4Bits(string, index) {
        var c = string.charCodeAt(index);
        if (c >= 48 && c <= 57) {
          return c - 48;
        } else if (c >= 65 && c <= 70) {
          return c - 55;
        } else if (c >= 97 && c <= 102) {
          return c - 87;
        } else {
          assert2(false, "Invalid character in " + string);
        }
      }
      function parseHexByte(string, lowerBound, index) {
        var r2 = parseHex4Bits(string, index);
        if (index - 1 >= lowerBound) {
          r2 |= parseHex4Bits(string, index - 1) << 4;
        }
        return r2;
      }
      BN3.prototype._parseHex = function _parseHex(number, start, endian) {
        this.length = Math.ceil((number.length - start) / 6);
        this.words = new Array(this.length);
        for (var i = 0; i < this.length; i++) {
          this.words[i] = 0;
        }
        var off = 0;
        var j = 0;
        var w;
        if (endian === "be") {
          for (i = number.length - 1; i >= start; i -= 2) {
            w = parseHexByte(number, start, i) << off;
            this.words[j] |= w & 67108863;
            if (off >= 18) {
              off -= 18;
              j += 1;
              this.words[j] |= w >>> 26;
            } else {
              off += 8;
            }
          }
        } else {
          var parseLength = number.length - start;
          for (i = parseLength % 2 === 0 ? start + 1 : start; i < number.length; i += 2) {
            w = parseHexByte(number, start, i) << off;
            this.words[j] |= w & 67108863;
            if (off >= 18) {
              off -= 18;
              j += 1;
              this.words[j] |= w >>> 26;
            } else {
              off += 8;
            }
          }
        }
        this._strip();
      };
      function parseBase(str, start, end, mul3) {
        var r2 = 0;
        var b = 0;
        var len = Math.min(str.length, end);
        for (var i = start; i < len; i++) {
          var c = str.charCodeAt(i) - 48;
          r2 *= mul3;
          if (c >= 49) {
            b = c - 49 + 10;
          } else if (c >= 17) {
            b = c - 17 + 10;
          } else {
            b = c;
          }
          assert2(c >= 0 && b < mul3, "Invalid character");
          r2 += b;
        }
        return r2;
      }
      BN3.prototype._parseBase = function _parseBase(number, base2, start) {
        this.words = [0];
        this.length = 1;
        for (var limbLen = 0, limbPow = 1; limbPow <= 67108863; limbPow *= base2) {
          limbLen++;
        }
        limbLen--;
        limbPow = limbPow / base2 | 0;
        var total = number.length - start;
        var mod = total % limbLen;
        var end = Math.min(total, total - mod) + start;
        var word = 0;
        for (var i = start; i < end; i += limbLen) {
          word = parseBase(number, i, i + limbLen, base2);
          this.imuln(limbPow);
          if (this.words[0] + word < 67108864) {
            this.words[0] += word;
          } else {
            this._iaddn(word);
          }
        }
        if (mod !== 0) {
          var pow = 1;
          word = parseBase(number, i, number.length, base2);
          for (i = 0; i < mod; i++) {
            pow *= base2;
          }
          this.imuln(pow);
          if (this.words[0] + word < 67108864) {
            this.words[0] += word;
          } else {
            this._iaddn(word);
          }
        }
        this._strip();
      };
      BN3.prototype.copy = function copy(dest) {
        dest.words = new Array(this.length);
        for (var i = 0; i < this.length; i++) {
          dest.words[i] = this.words[i];
        }
        dest.length = this.length;
        dest.negative = this.negative;
        dest.red = this.red;
      };
      function move(dest, src) {
        dest.words = src.words;
        dest.length = src.length;
        dest.negative = src.negative;
        dest.red = src.red;
      }
      BN3.prototype._move = function _move(dest) {
        move(dest, this);
      };
      BN3.prototype.clone = function clone() {
        var r2 = new BN3(null);
        this.copy(r2);
        return r2;
      };
      BN3.prototype._expand = function _expand(size) {
        while (this.length < size) {
          this.words[this.length++] = 0;
        }
        return this;
      };
      BN3.prototype._strip = function strip() {
        while (this.length > 1 && this.words[this.length - 1] === 0) {
          this.length--;
        }
        return this._normSign();
      };
      BN3.prototype._normSign = function _normSign() {
        if (this.length === 1 && this.words[0] === 0) {
          this.negative = 0;
        }
        return this;
      };
      if (typeof Symbol !== "undefined" && typeof Symbol.for === "function") {
        try {
          BN3.prototype[/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")] = inspect4;
        } catch (e) {
          BN3.prototype.inspect = inspect4;
        }
      } else {
        BN3.prototype.inspect = inspect4;
      }
      function inspect4() {
        return (this.red ? "<BN-R: " : "<BN: ") + this.toString(16) + ">";
      }
      var zeros2 = [
        "",
        "0",
        "00",
        "000",
        "0000",
        "00000",
        "000000",
        "0000000",
        "00000000",
        "000000000",
        "0000000000",
        "00000000000",
        "000000000000",
        "0000000000000",
        "00000000000000",
        "000000000000000",
        "0000000000000000",
        "00000000000000000",
        "000000000000000000",
        "0000000000000000000",
        "00000000000000000000",
        "000000000000000000000",
        "0000000000000000000000",
        "00000000000000000000000",
        "000000000000000000000000",
        "0000000000000000000000000"
      ];
      var groupSizes = [
        0,
        0,
        25,
        16,
        12,
        11,
        10,
        9,
        8,
        8,
        7,
        7,
        7,
        7,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5
      ];
      var groupBases = [
        0,
        0,
        33554432,
        43046721,
        16777216,
        48828125,
        60466176,
        40353607,
        16777216,
        43046721,
        1e7,
        19487171,
        35831808,
        62748517,
        7529536,
        11390625,
        16777216,
        24137569,
        34012224,
        47045881,
        64e6,
        4084101,
        5153632,
        6436343,
        7962624,
        9765625,
        11881376,
        14348907,
        17210368,
        20511149,
        243e5,
        28629151,
        33554432,
        39135393,
        45435424,
        52521875,
        60466176
      ];
      BN3.prototype.toString = function toString(base2, padding2) {
        base2 = base2 || 10;
        padding2 = padding2 | 0 || 1;
        var out;
        if (base2 === 16 || base2 === "hex") {
          out = "";
          var off = 0;
          var carry = 0;
          for (var i = 0; i < this.length; i++) {
            var w = this.words[i];
            var word = ((w << off | carry) & 16777215).toString(16);
            carry = w >>> 24 - off & 16777215;
            off += 2;
            if (off >= 26) {
              off -= 26;
              i--;
            }
            if (carry !== 0 || i !== this.length - 1) {
              out = zeros2[6 - word.length] + word + out;
            } else {
              out = word + out;
            }
          }
          if (carry !== 0) {
            out = carry.toString(16) + out;
          }
          while (out.length % padding2 !== 0) {
            out = "0" + out;
          }
          if (this.negative !== 0) {
            out = "-" + out;
          }
          return out;
        }
        if (base2 === (base2 | 0) && base2 >= 2 && base2 <= 36) {
          var groupSize = groupSizes[base2];
          var groupBase = groupBases[base2];
          out = "";
          var c = this.clone();
          c.negative = 0;
          while (!c.isZero()) {
            var r2 = c.modrn(groupBase).toString(base2);
            c = c.idivn(groupBase);
            if (!c.isZero()) {
              out = zeros2[groupSize - r2.length] + r2 + out;
            } else {
              out = r2 + out;
            }
          }
          if (this.isZero()) {
            out = "0" + out;
          }
          while (out.length % padding2 !== 0) {
            out = "0" + out;
          }
          if (this.negative !== 0) {
            out = "-" + out;
          }
          return out;
        }
        assert2(false, "Base should be between 2 and 36");
      };
      BN3.prototype.toNumber = function toNumber() {
        var ret = this.words[0];
        if (this.length === 2) {
          ret += this.words[1] * 67108864;
        } else if (this.length === 3 && this.words[2] === 1) {
          ret += 4503599627370496 + this.words[1] * 67108864;
        } else if (this.length > 2) {
          assert2(false, "Number can only safely store up to 53 bits");
        }
        return this.negative !== 0 ? -ret : ret;
      };
      BN3.prototype.toJSON = function toJSON2() {
        return this.toString(16, 2);
      };
      if (Buffer2) {
        BN3.prototype.toBuffer = function toBuffer(endian, length) {
          return this.toArrayLike(Buffer2, endian, length);
        };
      }
      BN3.prototype.toArray = function toArray(endian, length) {
        return this.toArrayLike(Array, endian, length);
      };
      var allocate = function allocate2(ArrayType, size) {
        if (ArrayType.allocUnsafe) {
          return ArrayType.allocUnsafe(size);
        }
        return new ArrayType(size);
      };
      BN3.prototype.toArrayLike = function toArrayLike(ArrayType, endian, length) {
        this._strip();
        var byteLength = this.byteLength();
        var reqLength = length || Math.max(1, byteLength);
        assert2(byteLength <= reqLength, "byte array longer than desired length");
        assert2(reqLength > 0, "Requested array length <= 0");
        var res = allocate(ArrayType, reqLength);
        var postfix = endian === "le" ? "LE" : "BE";
        this["_toArrayLike" + postfix](res, byteLength);
        return res;
      };
      BN3.prototype._toArrayLikeLE = function _toArrayLikeLE(res, byteLength) {
        var position = 0;
        var carry = 0;
        for (var i = 0, shift = 0; i < this.length; i++) {
          var word = this.words[i] << shift | carry;
          res[position++] = word & 255;
          if (position < res.length) {
            res[position++] = word >> 8 & 255;
          }
          if (position < res.length) {
            res[position++] = word >> 16 & 255;
          }
          if (shift === 6) {
            if (position < res.length) {
              res[position++] = word >> 24 & 255;
            }
            carry = 0;
            shift = 0;
          } else {
            carry = word >>> 24;
            shift += 2;
          }
        }
        if (position < res.length) {
          res[position++] = carry;
          while (position < res.length) {
            res[position++] = 0;
          }
        }
      };
      BN3.prototype._toArrayLikeBE = function _toArrayLikeBE(res, byteLength) {
        var position = res.length - 1;
        var carry = 0;
        for (var i = 0, shift = 0; i < this.length; i++) {
          var word = this.words[i] << shift | carry;
          res[position--] = word & 255;
          if (position >= 0) {
            res[position--] = word >> 8 & 255;
          }
          if (position >= 0) {
            res[position--] = word >> 16 & 255;
          }
          if (shift === 6) {
            if (position >= 0) {
              res[position--] = word >> 24 & 255;
            }
            carry = 0;
            shift = 0;
          } else {
            carry = word >>> 24;
            shift += 2;
          }
        }
        if (position >= 0) {
          res[position--] = carry;
          while (position >= 0) {
            res[position--] = 0;
          }
        }
      };
      if (Math.clz32) {
        BN3.prototype._countBits = function _countBits(w) {
          return 32 - Math.clz32(w);
        };
      } else {
        BN3.prototype._countBits = function _countBits(w) {
          var t = w;
          var r2 = 0;
          if (t >= 4096) {
            r2 += 13;
            t >>>= 13;
          }
          if (t >= 64) {
            r2 += 7;
            t >>>= 7;
          }
          if (t >= 8) {
            r2 += 4;
            t >>>= 4;
          }
          if (t >= 2) {
            r2 += 2;
            t >>>= 2;
          }
          return r2 + t;
        };
      }
      BN3.prototype._zeroBits = function _zeroBits(w) {
        if (w === 0) return 26;
        var t = w;
        var r2 = 0;
        if ((t & 8191) === 0) {
          r2 += 13;
          t >>>= 13;
        }
        if ((t & 127) === 0) {
          r2 += 7;
          t >>>= 7;
        }
        if ((t & 15) === 0) {
          r2 += 4;
          t >>>= 4;
        }
        if ((t & 3) === 0) {
          r2 += 2;
          t >>>= 2;
        }
        if ((t & 1) === 0) {
          r2++;
        }
        return r2;
      };
      BN3.prototype.bitLength = function bitLength() {
        var w = this.words[this.length - 1];
        var hi = this._countBits(w);
        return (this.length - 1) * 26 + hi;
      };
      function toBitArray(num) {
        var w = new Array(num.bitLength());
        for (var bit = 0; bit < w.length; bit++) {
          var off = bit / 26 | 0;
          var wbit = bit % 26;
          w[bit] = num.words[off] >>> wbit & 1;
        }
        return w;
      }
      BN3.prototype.zeroBits = function zeroBits() {
        if (this.isZero()) return 0;
        var r2 = 0;
        for (var i = 0; i < this.length; i++) {
          var b = this._zeroBits(this.words[i]);
          r2 += b;
          if (b !== 26) break;
        }
        return r2;
      };
      BN3.prototype.byteLength = function byteLength() {
        return Math.ceil(this.bitLength() / 8);
      };
      BN3.prototype.toTwos = function toTwos(width) {
        if (this.negative !== 0) {
          return this.abs().inotn(width).iaddn(1);
        }
        return this.clone();
      };
      BN3.prototype.fromTwos = function fromTwos(width) {
        if (this.testn(width - 1)) {
          return this.notn(width).iaddn(1).ineg();
        }
        return this.clone();
      };
      BN3.prototype.isNeg = function isNeg() {
        return this.negative !== 0;
      };
      BN3.prototype.neg = function neg3() {
        return this.clone().ineg();
      };
      BN3.prototype.ineg = function ineg() {
        if (!this.isZero()) {
          this.negative ^= 1;
        }
        return this;
      };
      BN3.prototype.iuor = function iuor(num) {
        while (this.length < num.length) {
          this.words[this.length++] = 0;
        }
        for (var i = 0; i < num.length; i++) {
          this.words[i] = this.words[i] | num.words[i];
        }
        return this._strip();
      };
      BN3.prototype.ior = function ior(num) {
        assert2((this.negative | num.negative) === 0);
        return this.iuor(num);
      };
      BN3.prototype.or = function or(num) {
        if (this.length > num.length) return this.clone().ior(num);
        return num.clone().ior(this);
      };
      BN3.prototype.uor = function uor(num) {
        if (this.length > num.length) return this.clone().iuor(num);
        return num.clone().iuor(this);
      };
      BN3.prototype.iuand = function iuand(num) {
        var b;
        if (this.length > num.length) {
          b = num;
        } else {
          b = this;
        }
        for (var i = 0; i < b.length; i++) {
          this.words[i] = this.words[i] & num.words[i];
        }
        this.length = b.length;
        return this._strip();
      };
      BN3.prototype.iand = function iand(num) {
        assert2((this.negative | num.negative) === 0);
        return this.iuand(num);
      };
      BN3.prototype.and = function and(num) {
        if (this.length > num.length) return this.clone().iand(num);
        return num.clone().iand(this);
      };
      BN3.prototype.uand = function uand(num) {
        if (this.length > num.length) return this.clone().iuand(num);
        return num.clone().iuand(this);
      };
      BN3.prototype.iuxor = function iuxor(num) {
        var a;
        var b;
        if (this.length > num.length) {
          a = this;
          b = num;
        } else {
          a = num;
          b = this;
        }
        for (var i = 0; i < b.length; i++) {
          this.words[i] = a.words[i] ^ b.words[i];
        }
        if (this !== a) {
          for (; i < a.length; i++) {
            this.words[i] = a.words[i];
          }
        }
        this.length = a.length;
        return this._strip();
      };
      BN3.prototype.ixor = function ixor(num) {
        assert2((this.negative | num.negative) === 0);
        return this.iuxor(num);
      };
      BN3.prototype.xor = function xor(num) {
        if (this.length > num.length) return this.clone().ixor(num);
        return num.clone().ixor(this);
      };
      BN3.prototype.uxor = function uxor(num) {
        if (this.length > num.length) return this.clone().iuxor(num);
        return num.clone().iuxor(this);
      };
      BN3.prototype.inotn = function inotn(width) {
        assert2(typeof width === "number" && width >= 0);
        var bytesNeeded = Math.ceil(width / 26) | 0;
        var bitsLeft = width % 26;
        this._expand(bytesNeeded);
        if (bitsLeft > 0) {
          bytesNeeded--;
        }
        for (var i = 0; i < bytesNeeded; i++) {
          this.words[i] = ~this.words[i] & 67108863;
        }
        if (bitsLeft > 0) {
          this.words[i] = ~this.words[i] & 67108863 >> 26 - bitsLeft;
        }
        return this._strip();
      };
      BN3.prototype.notn = function notn(width) {
        return this.clone().inotn(width);
      };
      BN3.prototype.setn = function setn(bit, val) {
        assert2(typeof bit === "number" && bit >= 0);
        var off = bit / 26 | 0;
        var wbit = bit % 26;
        this._expand(off + 1);
        if (val) {
          this.words[off] = this.words[off] | 1 << wbit;
        } else {
          this.words[off] = this.words[off] & ~(1 << wbit);
        }
        return this._strip();
      };
      BN3.prototype.iadd = function iadd(num) {
        var r2;
        if (this.negative !== 0 && num.negative === 0) {
          this.negative = 0;
          r2 = this.isub(num);
          this.negative ^= 1;
          return this._normSign();
        } else if (this.negative === 0 && num.negative !== 0) {
          num.negative = 0;
          r2 = this.isub(num);
          num.negative = 1;
          return r2._normSign();
        }
        var a, b;
        if (this.length > num.length) {
          a = this;
          b = num;
        } else {
          a = num;
          b = this;
        }
        var carry = 0;
        for (var i = 0; i < b.length; i++) {
          r2 = (a.words[i] | 0) + (b.words[i] | 0) + carry;
          this.words[i] = r2 & 67108863;
          carry = r2 >>> 26;
        }
        for (; carry !== 0 && i < a.length; i++) {
          r2 = (a.words[i] | 0) + carry;
          this.words[i] = r2 & 67108863;
          carry = r2 >>> 26;
        }
        this.length = a.length;
        if (carry !== 0) {
          this.words[this.length] = carry;
          this.length++;
        } else if (a !== this) {
          for (; i < a.length; i++) {
            this.words[i] = a.words[i];
          }
        }
        return this;
      };
      BN3.prototype.add = function add3(num) {
        var res;
        if (num.negative !== 0 && this.negative === 0) {
          num.negative = 0;
          res = this.sub(num);
          num.negative ^= 1;
          return res;
        } else if (num.negative === 0 && this.negative !== 0) {
          this.negative = 0;
          res = num.sub(this);
          this.negative = 1;
          return res;
        }
        if (this.length > num.length) return this.clone().iadd(num);
        return num.clone().iadd(this);
      };
      BN3.prototype.isub = function isub(num) {
        if (num.negative !== 0) {
          num.negative = 0;
          var r2 = this.iadd(num);
          num.negative = 1;
          return r2._normSign();
        } else if (this.negative !== 0) {
          this.negative = 0;
          this.iadd(num);
          this.negative = 1;
          return this._normSign();
        }
        var cmp = this.cmp(num);
        if (cmp === 0) {
          this.negative = 0;
          this.length = 1;
          this.words[0] = 0;
          return this;
        }
        var a, b;
        if (cmp > 0) {
          a = this;
          b = num;
        } else {
          a = num;
          b = this;
        }
        var carry = 0;
        for (var i = 0; i < b.length; i++) {
          r2 = (a.words[i] | 0) - (b.words[i] | 0) + carry;
          carry = r2 >> 26;
          this.words[i] = r2 & 67108863;
        }
        for (; carry !== 0 && i < a.length; i++) {
          r2 = (a.words[i] | 0) + carry;
          carry = r2 >> 26;
          this.words[i] = r2 & 67108863;
        }
        if (carry === 0 && i < a.length && a !== this) {
          for (; i < a.length; i++) {
            this.words[i] = a.words[i];
          }
        }
        this.length = Math.max(this.length, i);
        if (a !== this) {
          this.negative = 1;
        }
        return this._strip();
      };
      BN3.prototype.sub = function sub(num) {
        return this.clone().isub(num);
      };
      function smallMulTo(self2, num, out) {
        out.negative = num.negative ^ self2.negative;
        var len = self2.length + num.length | 0;
        out.length = len;
        len = len - 1 | 0;
        var a = self2.words[0] | 0;
        var b = num.words[0] | 0;
        var r2 = a * b;
        var lo = r2 & 67108863;
        var carry = r2 / 67108864 | 0;
        out.words[0] = lo;
        for (var k = 1; k < len; k++) {
          var ncarry = carry >>> 26;
          var rword = carry & 67108863;
          var maxJ = Math.min(k, num.length - 1);
          for (var j = Math.max(0, k - self2.length + 1); j <= maxJ; j++) {
            var i = k - j | 0;
            a = self2.words[i] | 0;
            b = num.words[j] | 0;
            r2 = a * b + rword;
            ncarry += r2 / 67108864 | 0;
            rword = r2 & 67108863;
          }
          out.words[k] = rword | 0;
          carry = ncarry | 0;
        }
        if (carry !== 0) {
          out.words[k] = carry | 0;
        } else {
          out.length--;
        }
        return out._strip();
      }
      var comb10MulTo = function comb10MulTo2(self2, num, out) {
        var a = self2.words;
        var b = num.words;
        var o = out.words;
        var c = 0;
        var lo;
        var mid;
        var hi;
        var a0 = a[0] | 0;
        var al0 = a0 & 8191;
        var ah0 = a0 >>> 13;
        var a1 = a[1] | 0;
        var al1 = a1 & 8191;
        var ah1 = a1 >>> 13;
        var a2 = a[2] | 0;
        var al2 = a2 & 8191;
        var ah2 = a2 >>> 13;
        var a3 = a[3] | 0;
        var al3 = a3 & 8191;
        var ah3 = a3 >>> 13;
        var a4 = a[4] | 0;
        var al4 = a4 & 8191;
        var ah4 = a4 >>> 13;
        var a5 = a[5] | 0;
        var al5 = a5 & 8191;
        var ah5 = a5 >>> 13;
        var a6 = a[6] | 0;
        var al6 = a6 & 8191;
        var ah6 = a6 >>> 13;
        var a7 = a[7] | 0;
        var al7 = a7 & 8191;
        var ah7 = a7 >>> 13;
        var a8 = a[8] | 0;
        var al8 = a8 & 8191;
        var ah8 = a8 >>> 13;
        var a9 = a[9] | 0;
        var al9 = a9 & 8191;
        var ah9 = a9 >>> 13;
        var b0 = b[0] | 0;
        var bl0 = b0 & 8191;
        var bh0 = b0 >>> 13;
        var b1 = b[1] | 0;
        var bl1 = b1 & 8191;
        var bh1 = b1 >>> 13;
        var b2 = b[2] | 0;
        var bl2 = b2 & 8191;
        var bh2 = b2 >>> 13;
        var b3 = b[3] | 0;
        var bl3 = b3 & 8191;
        var bh3 = b3 >>> 13;
        var b4 = b[4] | 0;
        var bl4 = b4 & 8191;
        var bh4 = b4 >>> 13;
        var b5 = b[5] | 0;
        var bl5 = b5 & 8191;
        var bh5 = b5 >>> 13;
        var b6 = b[6] | 0;
        var bl6 = b6 & 8191;
        var bh6 = b6 >>> 13;
        var b7 = b[7] | 0;
        var bl7 = b7 & 8191;
        var bh7 = b7 >>> 13;
        var b8 = b[8] | 0;
        var bl8 = b8 & 8191;
        var bh8 = b8 >>> 13;
        var b9 = b[9] | 0;
        var bl9 = b9 & 8191;
        var bh9 = b9 >>> 13;
        out.negative = self2.negative ^ num.negative;
        out.length = 19;
        lo = Math.imul(al0, bl0);
        mid = Math.imul(al0, bh0);
        mid = mid + Math.imul(ah0, bl0) | 0;
        hi = Math.imul(ah0, bh0);
        var w0 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w0 >>> 26) | 0;
        w0 &= 67108863;
        lo = Math.imul(al1, bl0);
        mid = Math.imul(al1, bh0);
        mid = mid + Math.imul(ah1, bl0) | 0;
        hi = Math.imul(ah1, bh0);
        lo = lo + Math.imul(al0, bl1) | 0;
        mid = mid + Math.imul(al0, bh1) | 0;
        mid = mid + Math.imul(ah0, bl1) | 0;
        hi = hi + Math.imul(ah0, bh1) | 0;
        var w1 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w1 >>> 26) | 0;
        w1 &= 67108863;
        lo = Math.imul(al2, bl0);
        mid = Math.imul(al2, bh0);
        mid = mid + Math.imul(ah2, bl0) | 0;
        hi = Math.imul(ah2, bh0);
        lo = lo + Math.imul(al1, bl1) | 0;
        mid = mid + Math.imul(al1, bh1) | 0;
        mid = mid + Math.imul(ah1, bl1) | 0;
        hi = hi + Math.imul(ah1, bh1) | 0;
        lo = lo + Math.imul(al0, bl2) | 0;
        mid = mid + Math.imul(al0, bh2) | 0;
        mid = mid + Math.imul(ah0, bl2) | 0;
        hi = hi + Math.imul(ah0, bh2) | 0;
        var w2 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w2 >>> 26) | 0;
        w2 &= 67108863;
        lo = Math.imul(al3, bl0);
        mid = Math.imul(al3, bh0);
        mid = mid + Math.imul(ah3, bl0) | 0;
        hi = Math.imul(ah3, bh0);
        lo = lo + Math.imul(al2, bl1) | 0;
        mid = mid + Math.imul(al2, bh1) | 0;
        mid = mid + Math.imul(ah2, bl1) | 0;
        hi = hi + Math.imul(ah2, bh1) | 0;
        lo = lo + Math.imul(al1, bl2) | 0;
        mid = mid + Math.imul(al1, bh2) | 0;
        mid = mid + Math.imul(ah1, bl2) | 0;
        hi = hi + Math.imul(ah1, bh2) | 0;
        lo = lo + Math.imul(al0, bl3) | 0;
        mid = mid + Math.imul(al0, bh3) | 0;
        mid = mid + Math.imul(ah0, bl3) | 0;
        hi = hi + Math.imul(ah0, bh3) | 0;
        var w3 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w3 >>> 26) | 0;
        w3 &= 67108863;
        lo = Math.imul(al4, bl0);
        mid = Math.imul(al4, bh0);
        mid = mid + Math.imul(ah4, bl0) | 0;
        hi = Math.imul(ah4, bh0);
        lo = lo + Math.imul(al3, bl1) | 0;
        mid = mid + Math.imul(al3, bh1) | 0;
        mid = mid + Math.imul(ah3, bl1) | 0;
        hi = hi + Math.imul(ah3, bh1) | 0;
        lo = lo + Math.imul(al2, bl2) | 0;
        mid = mid + Math.imul(al2, bh2) | 0;
        mid = mid + Math.imul(ah2, bl2) | 0;
        hi = hi + Math.imul(ah2, bh2) | 0;
        lo = lo + Math.imul(al1, bl3) | 0;
        mid = mid + Math.imul(al1, bh3) | 0;
        mid = mid + Math.imul(ah1, bl3) | 0;
        hi = hi + Math.imul(ah1, bh3) | 0;
        lo = lo + Math.imul(al0, bl4) | 0;
        mid = mid + Math.imul(al0, bh4) | 0;
        mid = mid + Math.imul(ah0, bl4) | 0;
        hi = hi + Math.imul(ah0, bh4) | 0;
        var w4 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w4 >>> 26) | 0;
        w4 &= 67108863;
        lo = Math.imul(al5, bl0);
        mid = Math.imul(al5, bh0);
        mid = mid + Math.imul(ah5, bl0) | 0;
        hi = Math.imul(ah5, bh0);
        lo = lo + Math.imul(al4, bl1) | 0;
        mid = mid + Math.imul(al4, bh1) | 0;
        mid = mid + Math.imul(ah4, bl1) | 0;
        hi = hi + Math.imul(ah4, bh1) | 0;
        lo = lo + Math.imul(al3, bl2) | 0;
        mid = mid + Math.imul(al3, bh2) | 0;
        mid = mid + Math.imul(ah3, bl2) | 0;
        hi = hi + Math.imul(ah3, bh2) | 0;
        lo = lo + Math.imul(al2, bl3) | 0;
        mid = mid + Math.imul(al2, bh3) | 0;
        mid = mid + Math.imul(ah2, bl3) | 0;
        hi = hi + Math.imul(ah2, bh3) | 0;
        lo = lo + Math.imul(al1, bl4) | 0;
        mid = mid + Math.imul(al1, bh4) | 0;
        mid = mid + Math.imul(ah1, bl4) | 0;
        hi = hi + Math.imul(ah1, bh4) | 0;
        lo = lo + Math.imul(al0, bl5) | 0;
        mid = mid + Math.imul(al0, bh5) | 0;
        mid = mid + Math.imul(ah0, bl5) | 0;
        hi = hi + Math.imul(ah0, bh5) | 0;
        var w5 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w5 >>> 26) | 0;
        w5 &= 67108863;
        lo = Math.imul(al6, bl0);
        mid = Math.imul(al6, bh0);
        mid = mid + Math.imul(ah6, bl0) | 0;
        hi = Math.imul(ah6, bh0);
        lo = lo + Math.imul(al5, bl1) | 0;
        mid = mid + Math.imul(al5, bh1) | 0;
        mid = mid + Math.imul(ah5, bl1) | 0;
        hi = hi + Math.imul(ah5, bh1) | 0;
        lo = lo + Math.imul(al4, bl2) | 0;
        mid = mid + Math.imul(al4, bh2) | 0;
        mid = mid + Math.imul(ah4, bl2) | 0;
        hi = hi + Math.imul(ah4, bh2) | 0;
        lo = lo + Math.imul(al3, bl3) | 0;
        mid = mid + Math.imul(al3, bh3) | 0;
        mid = mid + Math.imul(ah3, bl3) | 0;
        hi = hi + Math.imul(ah3, bh3) | 0;
        lo = lo + Math.imul(al2, bl4) | 0;
        mid = mid + Math.imul(al2, bh4) | 0;
        mid = mid + Math.imul(ah2, bl4) | 0;
        hi = hi + Math.imul(ah2, bh4) | 0;
        lo = lo + Math.imul(al1, bl5) | 0;
        mid = mid + Math.imul(al1, bh5) | 0;
        mid = mid + Math.imul(ah1, bl5) | 0;
        hi = hi + Math.imul(ah1, bh5) | 0;
        lo = lo + Math.imul(al0, bl6) | 0;
        mid = mid + Math.imul(al0, bh6) | 0;
        mid = mid + Math.imul(ah0, bl6) | 0;
        hi = hi + Math.imul(ah0, bh6) | 0;
        var w6 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w6 >>> 26) | 0;
        w6 &= 67108863;
        lo = Math.imul(al7, bl0);
        mid = Math.imul(al7, bh0);
        mid = mid + Math.imul(ah7, bl0) | 0;
        hi = Math.imul(ah7, bh0);
        lo = lo + Math.imul(al6, bl1) | 0;
        mid = mid + Math.imul(al6, bh1) | 0;
        mid = mid + Math.imul(ah6, bl1) | 0;
        hi = hi + Math.imul(ah6, bh1) | 0;
        lo = lo + Math.imul(al5, bl2) | 0;
        mid = mid + Math.imul(al5, bh2) | 0;
        mid = mid + Math.imul(ah5, bl2) | 0;
        hi = hi + Math.imul(ah5, bh2) | 0;
        lo = lo + Math.imul(al4, bl3) | 0;
        mid = mid + Math.imul(al4, bh3) | 0;
        mid = mid + Math.imul(ah4, bl3) | 0;
        hi = hi + Math.imul(ah4, bh3) | 0;
        lo = lo + Math.imul(al3, bl4) | 0;
        mid = mid + Math.imul(al3, bh4) | 0;
        mid = mid + Math.imul(ah3, bl4) | 0;
        hi = hi + Math.imul(ah3, bh4) | 0;
        lo = lo + Math.imul(al2, bl5) | 0;
        mid = mid + Math.imul(al2, bh5) | 0;
        mid = mid + Math.imul(ah2, bl5) | 0;
        hi = hi + Math.imul(ah2, bh5) | 0;
        lo = lo + Math.imul(al1, bl6) | 0;
        mid = mid + Math.imul(al1, bh6) | 0;
        mid = mid + Math.imul(ah1, bl6) | 0;
        hi = hi + Math.imul(ah1, bh6) | 0;
        lo = lo + Math.imul(al0, bl7) | 0;
        mid = mid + Math.imul(al0, bh7) | 0;
        mid = mid + Math.imul(ah0, bl7) | 0;
        hi = hi + Math.imul(ah0, bh7) | 0;
        var w7 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w7 >>> 26) | 0;
        w7 &= 67108863;
        lo = Math.imul(al8, bl0);
        mid = Math.imul(al8, bh0);
        mid = mid + Math.imul(ah8, bl0) | 0;
        hi = Math.imul(ah8, bh0);
        lo = lo + Math.imul(al7, bl1) | 0;
        mid = mid + Math.imul(al7, bh1) | 0;
        mid = mid + Math.imul(ah7, bl1) | 0;
        hi = hi + Math.imul(ah7, bh1) | 0;
        lo = lo + Math.imul(al6, bl2) | 0;
        mid = mid + Math.imul(al6, bh2) | 0;
        mid = mid + Math.imul(ah6, bl2) | 0;
        hi = hi + Math.imul(ah6, bh2) | 0;
        lo = lo + Math.imul(al5, bl3) | 0;
        mid = mid + Math.imul(al5, bh3) | 0;
        mid = mid + Math.imul(ah5, bl3) | 0;
        hi = hi + Math.imul(ah5, bh3) | 0;
        lo = lo + Math.imul(al4, bl4) | 0;
        mid = mid + Math.imul(al4, bh4) | 0;
        mid = mid + Math.imul(ah4, bl4) | 0;
        hi = hi + Math.imul(ah4, bh4) | 0;
        lo = lo + Math.imul(al3, bl5) | 0;
        mid = mid + Math.imul(al3, bh5) | 0;
        mid = mid + Math.imul(ah3, bl5) | 0;
        hi = hi + Math.imul(ah3, bh5) | 0;
        lo = lo + Math.imul(al2, bl6) | 0;
        mid = mid + Math.imul(al2, bh6) | 0;
        mid = mid + Math.imul(ah2, bl6) | 0;
        hi = hi + Math.imul(ah2, bh6) | 0;
        lo = lo + Math.imul(al1, bl7) | 0;
        mid = mid + Math.imul(al1, bh7) | 0;
        mid = mid + Math.imul(ah1, bl7) | 0;
        hi = hi + Math.imul(ah1, bh7) | 0;
        lo = lo + Math.imul(al0, bl8) | 0;
        mid = mid + Math.imul(al0, bh8) | 0;
        mid = mid + Math.imul(ah0, bl8) | 0;
        hi = hi + Math.imul(ah0, bh8) | 0;
        var w8 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w8 >>> 26) | 0;
        w8 &= 67108863;
        lo = Math.imul(al9, bl0);
        mid = Math.imul(al9, bh0);
        mid = mid + Math.imul(ah9, bl0) | 0;
        hi = Math.imul(ah9, bh0);
        lo = lo + Math.imul(al8, bl1) | 0;
        mid = mid + Math.imul(al8, bh1) | 0;
        mid = mid + Math.imul(ah8, bl1) | 0;
        hi = hi + Math.imul(ah8, bh1) | 0;
        lo = lo + Math.imul(al7, bl2) | 0;
        mid = mid + Math.imul(al7, bh2) | 0;
        mid = mid + Math.imul(ah7, bl2) | 0;
        hi = hi + Math.imul(ah7, bh2) | 0;
        lo = lo + Math.imul(al6, bl3) | 0;
        mid = mid + Math.imul(al6, bh3) | 0;
        mid = mid + Math.imul(ah6, bl3) | 0;
        hi = hi + Math.imul(ah6, bh3) | 0;
        lo = lo + Math.imul(al5, bl4) | 0;
        mid = mid + Math.imul(al5, bh4) | 0;
        mid = mid + Math.imul(ah5, bl4) | 0;
        hi = hi + Math.imul(ah5, bh4) | 0;
        lo = lo + Math.imul(al4, bl5) | 0;
        mid = mid + Math.imul(al4, bh5) | 0;
        mid = mid + Math.imul(ah4, bl5) | 0;
        hi = hi + Math.imul(ah4, bh5) | 0;
        lo = lo + Math.imul(al3, bl6) | 0;
        mid = mid + Math.imul(al3, bh6) | 0;
        mid = mid + Math.imul(ah3, bl6) | 0;
        hi = hi + Math.imul(ah3, bh6) | 0;
        lo = lo + Math.imul(al2, bl7) | 0;
        mid = mid + Math.imul(al2, bh7) | 0;
        mid = mid + Math.imul(ah2, bl7) | 0;
        hi = hi + Math.imul(ah2, bh7) | 0;
        lo = lo + Math.imul(al1, bl8) | 0;
        mid = mid + Math.imul(al1, bh8) | 0;
        mid = mid + Math.imul(ah1, bl8) | 0;
        hi = hi + Math.imul(ah1, bh8) | 0;
        lo = lo + Math.imul(al0, bl9) | 0;
        mid = mid + Math.imul(al0, bh9) | 0;
        mid = mid + Math.imul(ah0, bl9) | 0;
        hi = hi + Math.imul(ah0, bh9) | 0;
        var w9 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w9 >>> 26) | 0;
        w9 &= 67108863;
        lo = Math.imul(al9, bl1);
        mid = Math.imul(al9, bh1);
        mid = mid + Math.imul(ah9, bl1) | 0;
        hi = Math.imul(ah9, bh1);
        lo = lo + Math.imul(al8, bl2) | 0;
        mid = mid + Math.imul(al8, bh2) | 0;
        mid = mid + Math.imul(ah8, bl2) | 0;
        hi = hi + Math.imul(ah8, bh2) | 0;
        lo = lo + Math.imul(al7, bl3) | 0;
        mid = mid + Math.imul(al7, bh3) | 0;
        mid = mid + Math.imul(ah7, bl3) | 0;
        hi = hi + Math.imul(ah7, bh3) | 0;
        lo = lo + Math.imul(al6, bl4) | 0;
        mid = mid + Math.imul(al6, bh4) | 0;
        mid = mid + Math.imul(ah6, bl4) | 0;
        hi = hi + Math.imul(ah6, bh4) | 0;
        lo = lo + Math.imul(al5, bl5) | 0;
        mid = mid + Math.imul(al5, bh5) | 0;
        mid = mid + Math.imul(ah5, bl5) | 0;
        hi = hi + Math.imul(ah5, bh5) | 0;
        lo = lo + Math.imul(al4, bl6) | 0;
        mid = mid + Math.imul(al4, bh6) | 0;
        mid = mid + Math.imul(ah4, bl6) | 0;
        hi = hi + Math.imul(ah4, bh6) | 0;
        lo = lo + Math.imul(al3, bl7) | 0;
        mid = mid + Math.imul(al3, bh7) | 0;
        mid = mid + Math.imul(ah3, bl7) | 0;
        hi = hi + Math.imul(ah3, bh7) | 0;
        lo = lo + Math.imul(al2, bl8) | 0;
        mid = mid + Math.imul(al2, bh8) | 0;
        mid = mid + Math.imul(ah2, bl8) | 0;
        hi = hi + Math.imul(ah2, bh8) | 0;
        lo = lo + Math.imul(al1, bl9) | 0;
        mid = mid + Math.imul(al1, bh9) | 0;
        mid = mid + Math.imul(ah1, bl9) | 0;
        hi = hi + Math.imul(ah1, bh9) | 0;
        var w10 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w10 >>> 26) | 0;
        w10 &= 67108863;
        lo = Math.imul(al9, bl2);
        mid = Math.imul(al9, bh2);
        mid = mid + Math.imul(ah9, bl2) | 0;
        hi = Math.imul(ah9, bh2);
        lo = lo + Math.imul(al8, bl3) | 0;
        mid = mid + Math.imul(al8, bh3) | 0;
        mid = mid + Math.imul(ah8, bl3) | 0;
        hi = hi + Math.imul(ah8, bh3) | 0;
        lo = lo + Math.imul(al7, bl4) | 0;
        mid = mid + Math.imul(al7, bh4) | 0;
        mid = mid + Math.imul(ah7, bl4) | 0;
        hi = hi + Math.imul(ah7, bh4) | 0;
        lo = lo + Math.imul(al6, bl5) | 0;
        mid = mid + Math.imul(al6, bh5) | 0;
        mid = mid + Math.imul(ah6, bl5) | 0;
        hi = hi + Math.imul(ah6, bh5) | 0;
        lo = lo + Math.imul(al5, bl6) | 0;
        mid = mid + Math.imul(al5, bh6) | 0;
        mid = mid + Math.imul(ah5, bl6) | 0;
        hi = hi + Math.imul(ah5, bh6) | 0;
        lo = lo + Math.imul(al4, bl7) | 0;
        mid = mid + Math.imul(al4, bh7) | 0;
        mid = mid + Math.imul(ah4, bl7) | 0;
        hi = hi + Math.imul(ah4, bh7) | 0;
        lo = lo + Math.imul(al3, bl8) | 0;
        mid = mid + Math.imul(al3, bh8) | 0;
        mid = mid + Math.imul(ah3, bl8) | 0;
        hi = hi + Math.imul(ah3, bh8) | 0;
        lo = lo + Math.imul(al2, bl9) | 0;
        mid = mid + Math.imul(al2, bh9) | 0;
        mid = mid + Math.imul(ah2, bl9) | 0;
        hi = hi + Math.imul(ah2, bh9) | 0;
        var w11 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w11 >>> 26) | 0;
        w11 &= 67108863;
        lo = Math.imul(al9, bl3);
        mid = Math.imul(al9, bh3);
        mid = mid + Math.imul(ah9, bl3) | 0;
        hi = Math.imul(ah9, bh3);
        lo = lo + Math.imul(al8, bl4) | 0;
        mid = mid + Math.imul(al8, bh4) | 0;
        mid = mid + Math.imul(ah8, bl4) | 0;
        hi = hi + Math.imul(ah8, bh4) | 0;
        lo = lo + Math.imul(al7, bl5) | 0;
        mid = mid + Math.imul(al7, bh5) | 0;
        mid = mid + Math.imul(ah7, bl5) | 0;
        hi = hi + Math.imul(ah7, bh5) | 0;
        lo = lo + Math.imul(al6, bl6) | 0;
        mid = mid + Math.imul(al6, bh6) | 0;
        mid = mid + Math.imul(ah6, bl6) | 0;
        hi = hi + Math.imul(ah6, bh6) | 0;
        lo = lo + Math.imul(al5, bl7) | 0;
        mid = mid + Math.imul(al5, bh7) | 0;
        mid = mid + Math.imul(ah5, bl7) | 0;
        hi = hi + Math.imul(ah5, bh7) | 0;
        lo = lo + Math.imul(al4, bl8) | 0;
        mid = mid + Math.imul(al4, bh8) | 0;
        mid = mid + Math.imul(ah4, bl8) | 0;
        hi = hi + Math.imul(ah4, bh8) | 0;
        lo = lo + Math.imul(al3, bl9) | 0;
        mid = mid + Math.imul(al3, bh9) | 0;
        mid = mid + Math.imul(ah3, bl9) | 0;
        hi = hi + Math.imul(ah3, bh9) | 0;
        var w12 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w12 >>> 26) | 0;
        w12 &= 67108863;
        lo = Math.imul(al9, bl4);
        mid = Math.imul(al9, bh4);
        mid = mid + Math.imul(ah9, bl4) | 0;
        hi = Math.imul(ah9, bh4);
        lo = lo + Math.imul(al8, bl5) | 0;
        mid = mid + Math.imul(al8, bh5) | 0;
        mid = mid + Math.imul(ah8, bl5) | 0;
        hi = hi + Math.imul(ah8, bh5) | 0;
        lo = lo + Math.imul(al7, bl6) | 0;
        mid = mid + Math.imul(al7, bh6) | 0;
        mid = mid + Math.imul(ah7, bl6) | 0;
        hi = hi + Math.imul(ah7, bh6) | 0;
        lo = lo + Math.imul(al6, bl7) | 0;
        mid = mid + Math.imul(al6, bh7) | 0;
        mid = mid + Math.imul(ah6, bl7) | 0;
        hi = hi + Math.imul(ah6, bh7) | 0;
        lo = lo + Math.imul(al5, bl8) | 0;
        mid = mid + Math.imul(al5, bh8) | 0;
        mid = mid + Math.imul(ah5, bl8) | 0;
        hi = hi + Math.imul(ah5, bh8) | 0;
        lo = lo + Math.imul(al4, bl9) | 0;
        mid = mid + Math.imul(al4, bh9) | 0;
        mid = mid + Math.imul(ah4, bl9) | 0;
        hi = hi + Math.imul(ah4, bh9) | 0;
        var w13 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w13 >>> 26) | 0;
        w13 &= 67108863;
        lo = Math.imul(al9, bl5);
        mid = Math.imul(al9, bh5);
        mid = mid + Math.imul(ah9, bl5) | 0;
        hi = Math.imul(ah9, bh5);
        lo = lo + Math.imul(al8, bl6) | 0;
        mid = mid + Math.imul(al8, bh6) | 0;
        mid = mid + Math.imul(ah8, bl6) | 0;
        hi = hi + Math.imul(ah8, bh6) | 0;
        lo = lo + Math.imul(al7, bl7) | 0;
        mid = mid + Math.imul(al7, bh7) | 0;
        mid = mid + Math.imul(ah7, bl7) | 0;
        hi = hi + Math.imul(ah7, bh7) | 0;
        lo = lo + Math.imul(al6, bl8) | 0;
        mid = mid + Math.imul(al6, bh8) | 0;
        mid = mid + Math.imul(ah6, bl8) | 0;
        hi = hi + Math.imul(ah6, bh8) | 0;
        lo = lo + Math.imul(al5, bl9) | 0;
        mid = mid + Math.imul(al5, bh9) | 0;
        mid = mid + Math.imul(ah5, bl9) | 0;
        hi = hi + Math.imul(ah5, bh9) | 0;
        var w14 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w14 >>> 26) | 0;
        w14 &= 67108863;
        lo = Math.imul(al9, bl6);
        mid = Math.imul(al9, bh6);
        mid = mid + Math.imul(ah9, bl6) | 0;
        hi = Math.imul(ah9, bh6);
        lo = lo + Math.imul(al8, bl7) | 0;
        mid = mid + Math.imul(al8, bh7) | 0;
        mid = mid + Math.imul(ah8, bl7) | 0;
        hi = hi + Math.imul(ah8, bh7) | 0;
        lo = lo + Math.imul(al7, bl8) | 0;
        mid = mid + Math.imul(al7, bh8) | 0;
        mid = mid + Math.imul(ah7, bl8) | 0;
        hi = hi + Math.imul(ah7, bh8) | 0;
        lo = lo + Math.imul(al6, bl9) | 0;
        mid = mid + Math.imul(al6, bh9) | 0;
        mid = mid + Math.imul(ah6, bl9) | 0;
        hi = hi + Math.imul(ah6, bh9) | 0;
        var w15 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w15 >>> 26) | 0;
        w15 &= 67108863;
        lo = Math.imul(al9, bl7);
        mid = Math.imul(al9, bh7);
        mid = mid + Math.imul(ah9, bl7) | 0;
        hi = Math.imul(ah9, bh7);
        lo = lo + Math.imul(al8, bl8) | 0;
        mid = mid + Math.imul(al8, bh8) | 0;
        mid = mid + Math.imul(ah8, bl8) | 0;
        hi = hi + Math.imul(ah8, bh8) | 0;
        lo = lo + Math.imul(al7, bl9) | 0;
        mid = mid + Math.imul(al7, bh9) | 0;
        mid = mid + Math.imul(ah7, bl9) | 0;
        hi = hi + Math.imul(ah7, bh9) | 0;
        var w16 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w16 >>> 26) | 0;
        w16 &= 67108863;
        lo = Math.imul(al9, bl8);
        mid = Math.imul(al9, bh8);
        mid = mid + Math.imul(ah9, bl8) | 0;
        hi = Math.imul(ah9, bh8);
        lo = lo + Math.imul(al8, bl9) | 0;
        mid = mid + Math.imul(al8, bh9) | 0;
        mid = mid + Math.imul(ah8, bl9) | 0;
        hi = hi + Math.imul(ah8, bh9) | 0;
        var w17 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w17 >>> 26) | 0;
        w17 &= 67108863;
        lo = Math.imul(al9, bl9);
        mid = Math.imul(al9, bh9);
        mid = mid + Math.imul(ah9, bl9) | 0;
        hi = Math.imul(ah9, bh9);
        var w18 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w18 >>> 26) | 0;
        w18 &= 67108863;
        o[0] = w0;
        o[1] = w1;
        o[2] = w2;
        o[3] = w3;
        o[4] = w4;
        o[5] = w5;
        o[6] = w6;
        o[7] = w7;
        o[8] = w8;
        o[9] = w9;
        o[10] = w10;
        o[11] = w11;
        o[12] = w12;
        o[13] = w13;
        o[14] = w14;
        o[15] = w15;
        o[16] = w16;
        o[17] = w17;
        o[18] = w18;
        if (c !== 0) {
          o[19] = c;
          out.length++;
        }
        return out;
      };
      if (!Math.imul) {
        comb10MulTo = smallMulTo;
      }
      function bigMulTo(self2, num, out) {
        out.negative = num.negative ^ self2.negative;
        out.length = self2.length + num.length;
        var carry = 0;
        var hncarry = 0;
        for (var k = 0; k < out.length - 1; k++) {
          var ncarry = hncarry;
          hncarry = 0;
          var rword = carry & 67108863;
          var maxJ = Math.min(k, num.length - 1);
          for (var j = Math.max(0, k - self2.length + 1); j <= maxJ; j++) {
            var i = k - j;
            var a = self2.words[i] | 0;
            var b = num.words[j] | 0;
            var r2 = a * b;
            var lo = r2 & 67108863;
            ncarry = ncarry + (r2 / 67108864 | 0) | 0;
            lo = lo + rword | 0;
            rword = lo & 67108863;
            ncarry = ncarry + (lo >>> 26) | 0;
            hncarry += ncarry >>> 26;
            ncarry &= 67108863;
          }
          out.words[k] = rword;
          carry = ncarry;
          ncarry = hncarry;
        }
        if (carry !== 0) {
          out.words[k] = carry;
        } else {
          out.length--;
        }
        return out._strip();
      }
      function jumboMulTo(self2, num, out) {
        return bigMulTo(self2, num, out);
      }
      BN3.prototype.mulTo = function mulTo(num, out) {
        var res;
        var len = this.length + num.length;
        if (this.length === 10 && num.length === 10) {
          res = comb10MulTo(this, num, out);
        } else if (len < 63) {
          res = smallMulTo(this, num, out);
        } else if (len < 1024) {
          res = bigMulTo(this, num, out);
        } else {
          res = jumboMulTo(this, num, out);
        }
        return res;
      };
      function FFTM(x, y) {
        this.x = x;
        this.y = y;
      }
      FFTM.prototype.makeRBT = function makeRBT(N2) {
        var t = new Array(N2);
        var l = BN3.prototype._countBits(N2) - 1;
        for (var i = 0; i < N2; i++) {
          t[i] = this.revBin(i, l, N2);
        }
        return t;
      };
      FFTM.prototype.revBin = function revBin(x, l, N2) {
        if (x === 0 || x === N2 - 1) return x;
        var rb = 0;
        for (var i = 0; i < l; i++) {
          rb |= (x & 1) << l - i - 1;
          x >>= 1;
        }
        return rb;
      };
      FFTM.prototype.permute = function permute(rbt, rws, iws, rtws, itws, N2) {
        for (var i = 0; i < N2; i++) {
          rtws[i] = rws[rbt[i]];
          itws[i] = iws[rbt[i]];
        }
      };
      FFTM.prototype.transform = function transform(rws, iws, rtws, itws, N2, rbt) {
        this.permute(rbt, rws, iws, rtws, itws, N2);
        for (var s = 1; s < N2; s <<= 1) {
          var l = s << 1;
          var rtwdf = Math.cos(2 * Math.PI / l);
          var itwdf = Math.sin(2 * Math.PI / l);
          for (var p = 0; p < N2; p += l) {
            var rtwdf_ = rtwdf;
            var itwdf_ = itwdf;
            for (var j = 0; j < s; j++) {
              var re = rtws[p + j];
              var ie = itws[p + j];
              var ro = rtws[p + j + s];
              var io = itws[p + j + s];
              var rx = rtwdf_ * ro - itwdf_ * io;
              io = rtwdf_ * io + itwdf_ * ro;
              ro = rx;
              rtws[p + j] = re + ro;
              itws[p + j] = ie + io;
              rtws[p + j + s] = re - ro;
              itws[p + j + s] = ie - io;
              if (j !== l) {
                rx = rtwdf * rtwdf_ - itwdf * itwdf_;
                itwdf_ = rtwdf * itwdf_ + itwdf * rtwdf_;
                rtwdf_ = rx;
              }
            }
          }
        }
      };
      FFTM.prototype.guessLen13b = function guessLen13b(n, m) {
        var N2 = Math.max(m, n) | 1;
        var odd = N2 & 1;
        var i = 0;
        for (N2 = N2 / 2 | 0; N2; N2 = N2 >>> 1) {
          i++;
        }
        return 1 << i + 1 + odd;
      };
      FFTM.prototype.conjugate = function conjugate(rws, iws, N2) {
        if (N2 <= 1) return;
        for (var i = 0; i < N2 / 2; i++) {
          var t = rws[i];
          rws[i] = rws[N2 - i - 1];
          rws[N2 - i - 1] = t;
          t = iws[i];
          iws[i] = -iws[N2 - i - 1];
          iws[N2 - i - 1] = -t;
        }
      };
      FFTM.prototype.normalize13b = function normalize13b(ws, N2) {
        var carry = 0;
        for (var i = 0; i < N2 / 2; i++) {
          var w = Math.round(ws[2 * i + 1] / N2) * 8192 + Math.round(ws[2 * i] / N2) + carry;
          ws[i] = w & 67108863;
          if (w < 67108864) {
            carry = 0;
          } else {
            carry = w / 67108864 | 0;
          }
        }
        return ws;
      };
      FFTM.prototype.convert13b = function convert13b(ws, len, rws, N2) {
        var carry = 0;
        for (var i = 0; i < len; i++) {
          carry = carry + (ws[i] | 0);
          rws[2 * i] = carry & 8191;
          carry = carry >>> 13;
          rws[2 * i + 1] = carry & 8191;
          carry = carry >>> 13;
        }
        for (i = 2 * len; i < N2; ++i) {
          rws[i] = 0;
        }
        assert2(carry === 0);
        assert2((carry & ~8191) === 0);
      };
      FFTM.prototype.stub = function stub(N2) {
        var ph = new Array(N2);
        for (var i = 0; i < N2; i++) {
          ph[i] = 0;
        }
        return ph;
      };
      FFTM.prototype.mulp = function mulp(x, y, out) {
        var N2 = 2 * this.guessLen13b(x.length, y.length);
        var rbt = this.makeRBT(N2);
        var _ = this.stub(N2);
        var rws = new Array(N2);
        var rwst = new Array(N2);
        var iwst = new Array(N2);
        var nrws = new Array(N2);
        var nrwst = new Array(N2);
        var niwst = new Array(N2);
        var rmws = out.words;
        rmws.length = N2;
        this.convert13b(x.words, x.length, rws, N2);
        this.convert13b(y.words, y.length, nrws, N2);
        this.transform(rws, _, rwst, iwst, N2, rbt);
        this.transform(nrws, _, nrwst, niwst, N2, rbt);
        for (var i = 0; i < N2; i++) {
          var rx = rwst[i] * nrwst[i] - iwst[i] * niwst[i];
          iwst[i] = rwst[i] * niwst[i] + iwst[i] * nrwst[i];
          rwst[i] = rx;
        }
        this.conjugate(rwst, iwst, N2);
        this.transform(rwst, iwst, rmws, _, N2, rbt);
        this.conjugate(rmws, _, N2);
        this.normalize13b(rmws, N2);
        out.negative = x.negative ^ y.negative;
        out.length = x.length + y.length;
        return out._strip();
      };
      BN3.prototype.mul = function mul3(num) {
        var out = new BN3(null);
        out.words = new Array(this.length + num.length);
        return this.mulTo(num, out);
      };
      BN3.prototype.mulf = function mulf(num) {
        var out = new BN3(null);
        out.words = new Array(this.length + num.length);
        return jumboMulTo(this, num, out);
      };
      BN3.prototype.imul = function imul(num) {
        return this.clone().mulTo(num, this);
      };
      BN3.prototype.imuln = function imuln(num) {
        var isNegNum = num < 0;
        if (isNegNum) num = -num;
        assert2(typeof num === "number");
        assert2(num < 67108864);
        var carry = 0;
        for (var i = 0; i < this.length; i++) {
          var w = (this.words[i] | 0) * num;
          var lo = (w & 67108863) + (carry & 67108863);
          carry >>= 26;
          carry += w / 67108864 | 0;
          carry += lo >>> 26;
          this.words[i] = lo & 67108863;
        }
        if (carry !== 0) {
          this.words[i] = carry;
          this.length++;
        }
        this.length = num === 0 ? 1 : this.length;
        return isNegNum ? this.ineg() : this;
      };
      BN3.prototype.muln = function muln(num) {
        return this.clone().imuln(num);
      };
      BN3.prototype.sqr = function sqr() {
        return this.mul(this);
      };
      BN3.prototype.isqr = function isqr() {
        return this.imul(this.clone());
      };
      BN3.prototype.pow = function pow(num) {
        var w = toBitArray(num);
        if (w.length === 0) return new BN3(1);
        var res = this;
        for (var i = 0; i < w.length; i++, res = res.sqr()) {
          if (w[i] !== 0) break;
        }
        if (++i < w.length) {
          for (var q = res.sqr(); i < w.length; i++, q = q.sqr()) {
            if (w[i] === 0) continue;
            res = res.mul(q);
          }
        }
        return res;
      };
      BN3.prototype.iushln = function iushln(bits) {
        assert2(typeof bits === "number" && bits >= 0);
        var r2 = bits % 26;
        var s = (bits - r2) / 26;
        var carryMask = 67108863 >>> 26 - r2 << 26 - r2;
        var i;
        if (r2 !== 0) {
          var carry = 0;
          for (i = 0; i < this.length; i++) {
            var newCarry = this.words[i] & carryMask;
            var c = (this.words[i] | 0) - newCarry << r2;
            this.words[i] = c | carry;
            carry = newCarry >>> 26 - r2;
          }
          if (carry) {
            this.words[i] = carry;
            this.length++;
          }
        }
        if (s !== 0) {
          for (i = this.length - 1; i >= 0; i--) {
            this.words[i + s] = this.words[i];
          }
          for (i = 0; i < s; i++) {
            this.words[i] = 0;
          }
          this.length += s;
        }
        return this._strip();
      };
      BN3.prototype.ishln = function ishln(bits) {
        assert2(this.negative === 0);
        return this.iushln(bits);
      };
      BN3.prototype.iushrn = function iushrn(bits, hint, extended) {
        assert2(typeof bits === "number" && bits >= 0);
        var h;
        if (hint) {
          h = (hint - hint % 26) / 26;
        } else {
          h = 0;
        }
        var r2 = bits % 26;
        var s = Math.min((bits - r2) / 26, this.length);
        var mask = 67108863 ^ 67108863 >>> r2 << r2;
        var maskedWords = extended;
        h -= s;
        h = Math.max(0, h);
        if (maskedWords) {
          for (var i = 0; i < s; i++) {
            maskedWords.words[i] = this.words[i];
          }
          maskedWords.length = s;
        }
        if (s === 0) {
        } else if (this.length > s) {
          this.length -= s;
          for (i = 0; i < this.length; i++) {
            this.words[i] = this.words[i + s];
          }
        } else {
          this.words[0] = 0;
          this.length = 1;
        }
        var carry = 0;
        for (i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
          var word = this.words[i] | 0;
          this.words[i] = carry << 26 - r2 | word >>> r2;
          carry = word & mask;
        }
        if (maskedWords && carry !== 0) {
          maskedWords.words[maskedWords.length++] = carry;
        }
        if (this.length === 0) {
          this.words[0] = 0;
          this.length = 1;
        }
        return this._strip();
      };
      BN3.prototype.ishrn = function ishrn(bits, hint, extended) {
        assert2(this.negative === 0);
        return this.iushrn(bits, hint, extended);
      };
      BN3.prototype.shln = function shln(bits) {
        return this.clone().ishln(bits);
      };
      BN3.prototype.ushln = function ushln(bits) {
        return this.clone().iushln(bits);
      };
      BN3.prototype.shrn = function shrn(bits) {
        return this.clone().ishrn(bits);
      };
      BN3.prototype.ushrn = function ushrn(bits) {
        return this.clone().iushrn(bits);
      };
      BN3.prototype.testn = function testn(bit) {
        assert2(typeof bit === "number" && bit >= 0);
        var r2 = bit % 26;
        var s = (bit - r2) / 26;
        var q = 1 << r2;
        if (this.length <= s) return false;
        var w = this.words[s];
        return !!(w & q);
      };
      BN3.prototype.imaskn = function imaskn(bits) {
        assert2(typeof bits === "number" && bits >= 0);
        var r2 = bits % 26;
        var s = (bits - r2) / 26;
        assert2(this.negative === 0, "imaskn works only with positive numbers");
        if (this.length <= s) {
          return this;
        }
        if (r2 !== 0) {
          s++;
        }
        this.length = Math.min(s, this.length);
        if (r2 !== 0) {
          var mask = 67108863 ^ 67108863 >>> r2 << r2;
          this.words[this.length - 1] &= mask;
        }
        return this._strip();
      };
      BN3.prototype.maskn = function maskn(bits) {
        return this.clone().imaskn(bits);
      };
      BN3.prototype.iaddn = function iaddn(num) {
        assert2(typeof num === "number");
        assert2(num < 67108864);
        if (num < 0) return this.isubn(-num);
        if (this.negative !== 0) {
          if (this.length === 1 && (this.words[0] | 0) <= num) {
            this.words[0] = num - (this.words[0] | 0);
            this.negative = 0;
            return this;
          }
          this.negative = 0;
          this.isubn(num);
          this.negative = 1;
          return this;
        }
        return this._iaddn(num);
      };
      BN3.prototype._iaddn = function _iaddn(num) {
        this.words[0] += num;
        for (var i = 0; i < this.length && this.words[i] >= 67108864; i++) {
          this.words[i] -= 67108864;
          if (i === this.length - 1) {
            this.words[i + 1] = 1;
          } else {
            this.words[i + 1]++;
          }
        }
        this.length = Math.max(this.length, i + 1);
        return this;
      };
      BN3.prototype.isubn = function isubn(num) {
        assert2(typeof num === "number");
        assert2(num < 67108864);
        if (num < 0) return this.iaddn(-num);
        if (this.negative !== 0) {
          this.negative = 0;
          this.iaddn(num);
          this.negative = 1;
          return this;
        }
        this.words[0] -= num;
        if (this.length === 1 && this.words[0] < 0) {
          this.words[0] = -this.words[0];
          this.negative = 1;
        } else {
          for (var i = 0; i < this.length && this.words[i] < 0; i++) {
            this.words[i] += 67108864;
            this.words[i + 1] -= 1;
          }
        }
        return this._strip();
      };
      BN3.prototype.addn = function addn(num) {
        return this.clone().iaddn(num);
      };
      BN3.prototype.subn = function subn(num) {
        return this.clone().isubn(num);
      };
      BN3.prototype.iabs = function iabs() {
        this.negative = 0;
        return this;
      };
      BN3.prototype.abs = function abs() {
        return this.clone().iabs();
      };
      BN3.prototype._ishlnsubmul = function _ishlnsubmul(num, mul3, shift) {
        var len = num.length + shift;
        var i;
        this._expand(len);
        var w;
        var carry = 0;
        for (i = 0; i < num.length; i++) {
          w = (this.words[i + shift] | 0) + carry;
          var right = (num.words[i] | 0) * mul3;
          w -= right & 67108863;
          carry = (w >> 26) - (right / 67108864 | 0);
          this.words[i + shift] = w & 67108863;
        }
        for (; i < this.length - shift; i++) {
          w = (this.words[i + shift] | 0) + carry;
          carry = w >> 26;
          this.words[i + shift] = w & 67108863;
        }
        if (carry === 0) return this._strip();
        assert2(carry === -1);
        carry = 0;
        for (i = 0; i < this.length; i++) {
          w = -(this.words[i] | 0) + carry;
          carry = w >> 26;
          this.words[i] = w & 67108863;
        }
        this.negative = 1;
        return this._strip();
      };
      BN3.prototype._wordDiv = function _wordDiv(num, mode) {
        var shift = this.length - num.length;
        var a = this.clone();
        var b = num;
        var bhi = b.words[b.length - 1] | 0;
        var bhiBits = this._countBits(bhi);
        shift = 26 - bhiBits;
        if (shift !== 0) {
          b = b.ushln(shift);
          a.iushln(shift);
          bhi = b.words[b.length - 1] | 0;
        }
        var m = a.length - b.length;
        var q;
        if (mode !== "mod") {
          q = new BN3(null);
          q.length = m + 1;
          q.words = new Array(q.length);
          for (var i = 0; i < q.length; i++) {
            q.words[i] = 0;
          }
        }
        var diff = a.clone()._ishlnsubmul(b, 1, m);
        if (diff.negative === 0) {
          a = diff;
          if (q) {
            q.words[m] = 1;
          }
        }
        for (var j = m - 1; j >= 0; j--) {
          var qj = (a.words[b.length + j] | 0) * 67108864 + (a.words[b.length + j - 1] | 0);
          qj = Math.min(qj / bhi | 0, 67108863);
          a._ishlnsubmul(b, qj, j);
          while (a.negative !== 0) {
            qj--;
            a.negative = 0;
            a._ishlnsubmul(b, 1, j);
            if (!a.isZero()) {
              a.negative ^= 1;
            }
          }
          if (q) {
            q.words[j] = qj;
          }
        }
        if (q) {
          q._strip();
        }
        a._strip();
        if (mode !== "div" && shift !== 0) {
          a.iushrn(shift);
        }
        return {
          div: q || null,
          mod: a
        };
      };
      BN3.prototype.divmod = function divmod(num, mode, positive) {
        assert2(!num.isZero());
        if (this.isZero()) {
          return {
            div: new BN3(0),
            mod: new BN3(0)
          };
        }
        var div, mod, res;
        if (this.negative !== 0 && num.negative === 0) {
          res = this.neg().divmod(num, mode);
          if (mode !== "mod") {
            div = res.div.neg();
          }
          if (mode !== "div") {
            mod = res.mod.neg();
            if (positive && mod.negative !== 0) {
              mod.iadd(num);
            }
          }
          return {
            div,
            mod
          };
        }
        if (this.negative === 0 && num.negative !== 0) {
          res = this.divmod(num.neg(), mode);
          if (mode !== "mod") {
            div = res.div.neg();
          }
          return {
            div,
            mod: res.mod
          };
        }
        if ((this.negative & num.negative) !== 0) {
          res = this.neg().divmod(num.neg(), mode);
          if (mode !== "div") {
            mod = res.mod.neg();
            if (positive && mod.negative !== 0) {
              mod.isub(num);
            }
          }
          return {
            div: res.div,
            mod
          };
        }
        if (num.length > this.length || this.cmp(num) < 0) {
          return {
            div: new BN3(0),
            mod: this
          };
        }
        if (num.length === 1) {
          if (mode === "div") {
            return {
              div: this.divn(num.words[0]),
              mod: null
            };
          }
          if (mode === "mod") {
            return {
              div: null,
              mod: new BN3(this.modrn(num.words[0]))
            };
          }
          return {
            div: this.divn(num.words[0]),
            mod: new BN3(this.modrn(num.words[0]))
          };
        }
        return this._wordDiv(num, mode);
      };
      BN3.prototype.div = function div(num) {
        return this.divmod(num, "div", false).div;
      };
      BN3.prototype.mod = function mod(num) {
        return this.divmod(num, "mod", false).mod;
      };
      BN3.prototype.umod = function umod(num) {
        return this.divmod(num, "mod", true).mod;
      };
      BN3.prototype.divRound = function divRound(num) {
        var dm = this.divmod(num);
        if (dm.mod.isZero()) return dm.div;
        var mod = dm.div.negative !== 0 ? dm.mod.isub(num) : dm.mod;
        var half = num.ushrn(1);
        var r2 = num.andln(1);
        var cmp = mod.cmp(half);
        if (cmp < 0 || r2 === 1 && cmp === 0) return dm.div;
        return dm.div.negative !== 0 ? dm.div.isubn(1) : dm.div.iaddn(1);
      };
      BN3.prototype.modrn = function modrn(num) {
        var isNegNum = num < 0;
        if (isNegNum) num = -num;
        assert2(num <= 67108863);
        var p = (1 << 26) % num;
        var acc = 0;
        for (var i = this.length - 1; i >= 0; i--) {
          acc = (p * acc + (this.words[i] | 0)) % num;
        }
        return isNegNum ? -acc : acc;
      };
      BN3.prototype.modn = function modn(num) {
        return this.modrn(num);
      };
      BN3.prototype.idivn = function idivn(num) {
        var isNegNum = num < 0;
        if (isNegNum) num = -num;
        assert2(num <= 67108863);
        var carry = 0;
        for (var i = this.length - 1; i >= 0; i--) {
          var w = (this.words[i] | 0) + carry * 67108864;
          this.words[i] = w / num | 0;
          carry = w % num;
        }
        this._strip();
        return isNegNum ? this.ineg() : this;
      };
      BN3.prototype.divn = function divn(num) {
        return this.clone().idivn(num);
      };
      BN3.prototype.egcd = function egcd(p) {
        assert2(p.negative === 0);
        assert2(!p.isZero());
        var x = this;
        var y = p.clone();
        if (x.negative !== 0) {
          x = x.umod(p);
        } else {
          x = x.clone();
        }
        var A = new BN3(1);
        var B = new BN3(0);
        var C = new BN3(0);
        var D = new BN3(1);
        var g = 0;
        while (x.isEven() && y.isEven()) {
          x.iushrn(1);
          y.iushrn(1);
          ++g;
        }
        var yp = y.clone();
        var xp = x.clone();
        while (!x.isZero()) {
          for (var i = 0, im = 1; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1) ;
          if (i > 0) {
            x.iushrn(i);
            while (i-- > 0) {
              if (A.isOdd() || B.isOdd()) {
                A.iadd(yp);
                B.isub(xp);
              }
              A.iushrn(1);
              B.iushrn(1);
            }
          }
          for (var j = 0, jm = 1; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1) ;
          if (j > 0) {
            y.iushrn(j);
            while (j-- > 0) {
              if (C.isOdd() || D.isOdd()) {
                C.iadd(yp);
                D.isub(xp);
              }
              C.iushrn(1);
              D.iushrn(1);
            }
          }
          if (x.cmp(y) >= 0) {
            x.isub(y);
            A.isub(C);
            B.isub(D);
          } else {
            y.isub(x);
            C.isub(A);
            D.isub(B);
          }
        }
        return {
          a: C,
          b: D,
          gcd: y.iushln(g)
        };
      };
      BN3.prototype._invmp = function _invmp(p) {
        assert2(p.negative === 0);
        assert2(!p.isZero());
        var a = this;
        var b = p.clone();
        if (a.negative !== 0) {
          a = a.umod(p);
        } else {
          a = a.clone();
        }
        var x1 = new BN3(1);
        var x2 = new BN3(0);
        var delta = b.clone();
        while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
          for (var i = 0, im = 1; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1) ;
          if (i > 0) {
            a.iushrn(i);
            while (i-- > 0) {
              if (x1.isOdd()) {
                x1.iadd(delta);
              }
              x1.iushrn(1);
            }
          }
          for (var j = 0, jm = 1; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1) ;
          if (j > 0) {
            b.iushrn(j);
            while (j-- > 0) {
              if (x2.isOdd()) {
                x2.iadd(delta);
              }
              x2.iushrn(1);
            }
          }
          if (a.cmp(b) >= 0) {
            a.isub(b);
            x1.isub(x2);
          } else {
            b.isub(a);
            x2.isub(x1);
          }
        }
        var res;
        if (a.cmpn(1) === 0) {
          res = x1;
        } else {
          res = x2;
        }
        if (res.cmpn(0) < 0) {
          res.iadd(p);
        }
        return res;
      };
      BN3.prototype.gcd = function gcd(num) {
        if (this.isZero()) return num.abs();
        if (num.isZero()) return this.abs();
        var a = this.clone();
        var b = num.clone();
        a.negative = 0;
        b.negative = 0;
        for (var shift = 0; a.isEven() && b.isEven(); shift++) {
          a.iushrn(1);
          b.iushrn(1);
        }
        do {
          while (a.isEven()) {
            a.iushrn(1);
          }
          while (b.isEven()) {
            b.iushrn(1);
          }
          var r2 = a.cmp(b);
          if (r2 < 0) {
            var t = a;
            a = b;
            b = t;
          } else if (r2 === 0 || b.cmpn(1) === 0) {
            break;
          }
          a.isub(b);
        } while (true);
        return b.iushln(shift);
      };
      BN3.prototype.invm = function invm(num) {
        return this.egcd(num).a.umod(num);
      };
      BN3.prototype.isEven = function isEven() {
        return (this.words[0] & 1) === 0;
      };
      BN3.prototype.isOdd = function isOdd() {
        return (this.words[0] & 1) === 1;
      };
      BN3.prototype.andln = function andln(num) {
        return this.words[0] & num;
      };
      BN3.prototype.bincn = function bincn(bit) {
        assert2(typeof bit === "number");
        var r2 = bit % 26;
        var s = (bit - r2) / 26;
        var q = 1 << r2;
        if (this.length <= s) {
          this._expand(s + 1);
          this.words[s] |= q;
          return this;
        }
        var carry = q;
        for (var i = s; carry !== 0 && i < this.length; i++) {
          var w = this.words[i] | 0;
          w += carry;
          carry = w >>> 26;
          w &= 67108863;
          this.words[i] = w;
        }
        if (carry !== 0) {
          this.words[i] = carry;
          this.length++;
        }
        return this;
      };
      BN3.prototype.isZero = function isZero() {
        return this.length === 1 && this.words[0] === 0;
      };
      BN3.prototype.cmpn = function cmpn(num) {
        var negative = num < 0;
        if (this.negative !== 0 && !negative) return -1;
        if (this.negative === 0 && negative) return 1;
        this._strip();
        var res;
        if (this.length > 1) {
          res = 1;
        } else {
          if (negative) {
            num = -num;
          }
          assert2(num <= 67108863, "Number is too big");
          var w = this.words[0] | 0;
          res = w === num ? 0 : w < num ? -1 : 1;
        }
        if (this.negative !== 0) return -res | 0;
        return res;
      };
      BN3.prototype.cmp = function cmp(num) {
        if (this.negative !== 0 && num.negative === 0) return -1;
        if (this.negative === 0 && num.negative !== 0) return 1;
        var res = this.ucmp(num);
        if (this.negative !== 0) return -res | 0;
        return res;
      };
      BN3.prototype.ucmp = function ucmp(num) {
        if (this.length > num.length) return 1;
        if (this.length < num.length) return -1;
        var res = 0;
        for (var i = this.length - 1; i >= 0; i--) {
          var a = this.words[i] | 0;
          var b = num.words[i] | 0;
          if (a === b) continue;
          if (a < b) {
            res = -1;
          } else if (a > b) {
            res = 1;
          }
          break;
        }
        return res;
      };
      BN3.prototype.gtn = function gtn(num) {
        return this.cmpn(num) === 1;
      };
      BN3.prototype.gt = function gt(num) {
        return this.cmp(num) === 1;
      };
      BN3.prototype.gten = function gten(num) {
        return this.cmpn(num) >= 0;
      };
      BN3.prototype.gte = function gte(num) {
        return this.cmp(num) >= 0;
      };
      BN3.prototype.ltn = function ltn(num) {
        return this.cmpn(num) === -1;
      };
      BN3.prototype.lt = function lt(num) {
        return this.cmp(num) === -1;
      };
      BN3.prototype.lten = function lten(num) {
        return this.cmpn(num) <= 0;
      };
      BN3.prototype.lte = function lte(num) {
        return this.cmp(num) <= 0;
      };
      BN3.prototype.eqn = function eqn(num) {
        return this.cmpn(num) === 0;
      };
      BN3.prototype.eq = function eq4(num) {
        return this.cmp(num) === 0;
      };
      BN3.red = function red(num) {
        return new Red(num);
      };
      BN3.prototype.toRed = function toRed(ctx) {
        assert2(!this.red, "Already a number in reduction context");
        assert2(this.negative === 0, "red works only with positives");
        return ctx.convertTo(this)._forceRed(ctx);
      };
      BN3.prototype.fromRed = function fromRed() {
        assert2(this.red, "fromRed works only with numbers in reduction context");
        return this.red.convertFrom(this);
      };
      BN3.prototype._forceRed = function _forceRed(ctx) {
        this.red = ctx;
        return this;
      };
      BN3.prototype.forceRed = function forceRed(ctx) {
        assert2(!this.red, "Already a number in reduction context");
        return this._forceRed(ctx);
      };
      BN3.prototype.redAdd = function redAdd(num) {
        assert2(this.red, "redAdd works only with red numbers");
        return this.red.add(this, num);
      };
      BN3.prototype.redIAdd = function redIAdd(num) {
        assert2(this.red, "redIAdd works only with red numbers");
        return this.red.iadd(this, num);
      };
      BN3.prototype.redSub = function redSub(num) {
        assert2(this.red, "redSub works only with red numbers");
        return this.red.sub(this, num);
      };
      BN3.prototype.redISub = function redISub(num) {
        assert2(this.red, "redISub works only with red numbers");
        return this.red.isub(this, num);
      };
      BN3.prototype.redShl = function redShl(num) {
        assert2(this.red, "redShl works only with red numbers");
        return this.red.shl(this, num);
      };
      BN3.prototype.redMul = function redMul(num) {
        assert2(this.red, "redMul works only with red numbers");
        this.red._verify2(this, num);
        return this.red.mul(this, num);
      };
      BN3.prototype.redIMul = function redIMul(num) {
        assert2(this.red, "redMul works only with red numbers");
        this.red._verify2(this, num);
        return this.red.imul(this, num);
      };
      BN3.prototype.redSqr = function redSqr() {
        assert2(this.red, "redSqr works only with red numbers");
        this.red._verify1(this);
        return this.red.sqr(this);
      };
      BN3.prototype.redISqr = function redISqr() {
        assert2(this.red, "redISqr works only with red numbers");
        this.red._verify1(this);
        return this.red.isqr(this);
      };
      BN3.prototype.redSqrt = function redSqrt() {
        assert2(this.red, "redSqrt works only with red numbers");
        this.red._verify1(this);
        return this.red.sqrt(this);
      };
      BN3.prototype.redInvm = function redInvm() {
        assert2(this.red, "redInvm works only with red numbers");
        this.red._verify1(this);
        return this.red.invm(this);
      };
      BN3.prototype.redNeg = function redNeg() {
        assert2(this.red, "redNeg works only with red numbers");
        this.red._verify1(this);
        return this.red.neg(this);
      };
      BN3.prototype.redPow = function redPow(num) {
        assert2(this.red && !num.red, "redPow(normalNum)");
        this.red._verify1(this);
        return this.red.pow(this, num);
      };
      var primes = {
        k256: null,
        p224: null,
        p192: null,
        p25519: null
      };
      function MPrime(name, p) {
        this.name = name;
        this.p = new BN3(p, 16);
        this.n = this.p.bitLength();
        this.k = new BN3(1).iushln(this.n).isub(this.p);
        this.tmp = this._tmp();
      }
      MPrime.prototype._tmp = function _tmp() {
        var tmp = new BN3(null);
        tmp.words = new Array(Math.ceil(this.n / 13));
        return tmp;
      };
      MPrime.prototype.ireduce = function ireduce(num) {
        var r2 = num;
        var rlen;
        do {
          this.split(r2, this.tmp);
          r2 = this.imulK(r2);
          r2 = r2.iadd(this.tmp);
          rlen = r2.bitLength();
        } while (rlen > this.n);
        var cmp = rlen < this.n ? -1 : r2.ucmp(this.p);
        if (cmp === 0) {
          r2.words[0] = 0;
          r2.length = 1;
        } else if (cmp > 0) {
          r2.isub(this.p);
        } else {
          if (r2.strip !== void 0) {
            r2.strip();
          } else {
            r2._strip();
          }
        }
        return r2;
      };
      MPrime.prototype.split = function split(input, out) {
        input.iushrn(this.n, 0, out);
      };
      MPrime.prototype.imulK = function imulK(num) {
        return num.imul(this.k);
      };
      function K256() {
        MPrime.call(
          this,
          "k256",
          "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f"
        );
      }
      inherits(K256, MPrime);
      K256.prototype.split = function split(input, output) {
        var mask = 4194303;
        var outLen = Math.min(input.length, 9);
        for (var i = 0; i < outLen; i++) {
          output.words[i] = input.words[i];
        }
        output.length = outLen;
        if (input.length <= 9) {
          input.words[0] = 0;
          input.length = 1;
          return;
        }
        var prev = input.words[9];
        output.words[output.length++] = prev & mask;
        for (i = 10; i < input.length; i++) {
          var next = input.words[i] | 0;
          input.words[i - 10] = (next & mask) << 4 | prev >>> 22;
          prev = next;
        }
        prev >>>= 22;
        input.words[i - 10] = prev;
        if (prev === 0 && input.length > 10) {
          input.length -= 10;
        } else {
          input.length -= 9;
        }
      };
      K256.prototype.imulK = function imulK(num) {
        num.words[num.length] = 0;
        num.words[num.length + 1] = 0;
        num.length += 2;
        var lo = 0;
        for (var i = 0; i < num.length; i++) {
          var w = num.words[i] | 0;
          lo += w * 977;
          num.words[i] = lo & 67108863;
          lo = w * 64 + (lo / 67108864 | 0);
        }
        if (num.words[num.length - 1] === 0) {
          num.length--;
          if (num.words[num.length - 1] === 0) {
            num.length--;
          }
        }
        return num;
      };
      function P224() {
        MPrime.call(
          this,
          "p224",
          "ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001"
        );
      }
      inherits(P224, MPrime);
      function P192() {
        MPrime.call(
          this,
          "p192",
          "ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff"
        );
      }
      inherits(P192, MPrime);
      function P25519() {
        MPrime.call(
          this,
          "25519",
          "7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed"
        );
      }
      inherits(P25519, MPrime);
      P25519.prototype.imulK = function imulK(num) {
        var carry = 0;
        for (var i = 0; i < num.length; i++) {
          var hi = (num.words[i] | 0) * 19 + carry;
          var lo = hi & 67108863;
          hi >>>= 26;
          num.words[i] = lo;
          carry = hi;
        }
        if (carry !== 0) {
          num.words[num.length++] = carry;
        }
        return num;
      };
      BN3._prime = function prime(name) {
        if (primes[name]) return primes[name];
        var prime2;
        if (name === "k256") {
          prime2 = new K256();
        } else if (name === "p224") {
          prime2 = new P224();
        } else if (name === "p192") {
          prime2 = new P192();
        } else if (name === "p25519") {
          prime2 = new P25519();
        } else {
          throw new Error("Unknown prime " + name);
        }
        primes[name] = prime2;
        return prime2;
      };
      function Red(m) {
        if (typeof m === "string") {
          var prime = BN3._prime(m);
          this.m = prime.p;
          this.prime = prime;
        } else {
          assert2(m.gtn(1), "modulus must be greater than 1");
          this.m = m;
          this.prime = null;
        }
      }
      Red.prototype._verify1 = function _verify1(a) {
        assert2(a.negative === 0, "red works only with positives");
        assert2(a.red, "red works only with red numbers");
      };
      Red.prototype._verify2 = function _verify2(a, b) {
        assert2((a.negative | b.negative) === 0, "red works only with positives");
        assert2(
          a.red && a.red === b.red,
          "red works only with red numbers"
        );
      };
      Red.prototype.imod = function imod(a) {
        if (this.prime) return this.prime.ireduce(a)._forceRed(this);
        move(a, a.umod(this.m)._forceRed(this));
        return a;
      };
      Red.prototype.neg = function neg3(a) {
        if (a.isZero()) {
          return a.clone();
        }
        return this.m.sub(a)._forceRed(this);
      };
      Red.prototype.add = function add3(a, b) {
        this._verify2(a, b);
        var res = a.add(b);
        if (res.cmp(this.m) >= 0) {
          res.isub(this.m);
        }
        return res._forceRed(this);
      };
      Red.prototype.iadd = function iadd(a, b) {
        this._verify2(a, b);
        var res = a.iadd(b);
        if (res.cmp(this.m) >= 0) {
          res.isub(this.m);
        }
        return res;
      };
      Red.prototype.sub = function sub(a, b) {
        this._verify2(a, b);
        var res = a.sub(b);
        if (res.cmpn(0) < 0) {
          res.iadd(this.m);
        }
        return res._forceRed(this);
      };
      Red.prototype.isub = function isub(a, b) {
        this._verify2(a, b);
        var res = a.isub(b);
        if (res.cmpn(0) < 0) {
          res.iadd(this.m);
        }
        return res;
      };
      Red.prototype.shl = function shl(a, num) {
        this._verify1(a);
        return this.imod(a.ushln(num));
      };
      Red.prototype.imul = function imul(a, b) {
        this._verify2(a, b);
        return this.imod(a.imul(b));
      };
      Red.prototype.mul = function mul3(a, b) {
        this._verify2(a, b);
        return this.imod(a.mul(b));
      };
      Red.prototype.isqr = function isqr(a) {
        return this.imul(a, a.clone());
      };
      Red.prototype.sqr = function sqr(a) {
        return this.mul(a, a);
      };
      Red.prototype.sqrt = function sqrt(a) {
        if (a.isZero()) return a.clone();
        var mod3 = this.m.andln(3);
        assert2(mod3 % 2 === 1);
        if (mod3 === 3) {
          var pow = this.m.add(new BN3(1)).iushrn(2);
          return this.pow(a, pow);
        }
        var q = this.m.subn(1);
        var s = 0;
        while (!q.isZero() && q.andln(1) === 0) {
          s++;
          q.iushrn(1);
        }
        assert2(!q.isZero());
        var one = new BN3(1).toRed(this);
        var nOne = one.redNeg();
        var lpow = this.m.subn(1).iushrn(1);
        var z = this.m.bitLength();
        z = new BN3(2 * z * z).toRed(this);
        while (this.pow(z, lpow).cmp(nOne) !== 0) {
          z.redIAdd(nOne);
        }
        var c = this.pow(z, q);
        var r2 = this.pow(a, q.addn(1).iushrn(1));
        var t = this.pow(a, q);
        var m = s;
        while (t.cmp(one) !== 0) {
          var tmp = t;
          for (var i = 0; tmp.cmp(one) !== 0; i++) {
            tmp = tmp.redSqr();
          }
          assert2(i < m);
          var b = this.pow(c, new BN3(1).iushln(m - i - 1));
          r2 = r2.redMul(b);
          c = b.redSqr();
          t = t.redMul(c);
          m = i;
        }
        return r2;
      };
      Red.prototype.invm = function invm(a) {
        var inv = a._invmp(this.m);
        if (inv.negative !== 0) {
          inv.negative = 0;
          return this.imod(inv).redNeg();
        } else {
          return this.imod(inv);
        }
      };
      Red.prototype.pow = function pow(a, num) {
        if (num.isZero()) return new BN3(1).toRed(this);
        if (num.cmpn(1) === 0) return a.clone();
        var windowSize = 4;
        var wnd = new Array(1 << windowSize);
        wnd[0] = new BN3(1).toRed(this);
        wnd[1] = a;
        for (var i = 2; i < wnd.length; i++) {
          wnd[i] = this.mul(wnd[i - 1], a);
        }
        var res = wnd[0];
        var current = 0;
        var currentLen = 0;
        var start = num.bitLength() % 26;
        if (start === 0) {
          start = 26;
        }
        for (i = num.length - 1; i >= 0; i--) {
          var word = num.words[i];
          for (var j = start - 1; j >= 0; j--) {
            var bit = word >> j & 1;
            if (res !== wnd[0]) {
              res = this.sqr(res);
            }
            if (bit === 0 && current === 0) {
              currentLen = 0;
              continue;
            }
            current <<= 1;
            current |= bit;
            currentLen++;
            if (currentLen !== windowSize && (i !== 0 || j !== 0)) continue;
            res = this.mul(res, wnd[current]);
            currentLen = 0;
            current = 0;
          }
          start = 26;
        }
        return res;
      };
      Red.prototype.convertTo = function convertTo(num) {
        var r2 = num.umod(this.m);
        return r2 === num ? r2.clone() : r2;
      };
      Red.prototype.convertFrom = function convertFrom(num) {
        var res = num.clone();
        res.red = null;
        return res;
      };
      BN3.mont = function mont(num) {
        return new Mont(num);
      };
      function Mont(m) {
        Red.call(this, m);
        this.shift = this.m.bitLength();
        if (this.shift % 26 !== 0) {
          this.shift += 26 - this.shift % 26;
        }
        this.r = new BN3(1).iushln(this.shift);
        this.r2 = this.imod(this.r.sqr());
        this.rinv = this.r._invmp(this.m);
        this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
        this.minv = this.minv.umod(this.r);
        this.minv = this.r.sub(this.minv);
      }
      inherits(Mont, Red);
      Mont.prototype.convertTo = function convertTo(num) {
        return this.imod(num.ushln(this.shift));
      };
      Mont.prototype.convertFrom = function convertFrom(num) {
        var r2 = this.imod(num.mul(this.rinv));
        r2.red = null;
        return r2;
      };
      Mont.prototype.imul = function imul(a, b) {
        if (a.isZero() || b.isZero()) {
          a.words[0] = 0;
          a.length = 1;
          return a;
        }
        var t = a.imul(b);
        var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
        var u = t.isub(c).iushrn(this.shift);
        var res = u;
        if (u.cmp(this.m) >= 0) {
          res = u.isub(this.m);
        } else if (u.cmpn(0) < 0) {
          res = u.iadd(this.m);
        }
        return res._forceRed(this);
      };
      Mont.prototype.mul = function mul3(a, b) {
        if (a.isZero() || b.isZero()) return new BN3(0)._forceRed(this);
        var t = a.mul(b);
        var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
        var u = t.isub(c).iushrn(this.shift);
        var res = u;
        if (u.cmp(this.m) >= 0) {
          res = u.isub(this.m);
        } else if (u.cmpn(0) < 0) {
          res = u.iadd(this.m);
        }
        return res._forceRed(this);
      };
      Mont.prototype.invm = function invm(a) {
        var res = this.imod(a._invmp(this.m).mul(this.r2));
        return res._forceRed(this);
      };
    })(typeof module === "undefined" || module, exports);
  }
});

// ../../node_modules/@ethersproject/logger/lib.esm/_version.js
var version;
var init_version = __esm({
  "../../node_modules/@ethersproject/logger/lib.esm/_version.js"() {
    "use strict";
    version = "logger/5.8.0";
  }
});

// ../../node_modules/@ethersproject/logger/lib.esm/index.js
var lib_exports = {};
__export(lib_exports, {
  ErrorCode: () => ErrorCode,
  LogLevel: () => LogLevel,
  Logger: () => Logger
});
function _checkNormalize() {
  try {
    const missing = [];
    ["NFD", "NFC", "NFKD", "NFKC"].forEach((form) => {
      try {
        if ("test".normalize(form) !== "test") {
          throw new Error("bad normalize");
        }
        ;
      } catch (error) {
        missing.push(form);
      }
    });
    if (missing.length) {
      throw new Error("missing " + missing.join(", "));
    }
    if (String.fromCharCode(233).normalize("NFD") !== String.fromCharCode(101, 769)) {
      throw new Error("broken implementation");
    }
  } catch (error) {
    return error.message;
  }
  return null;
}
var _permanentCensorErrors, _censorErrors, LogLevels, _logLevel, _globalLogger, _normalizeError, LogLevel, ErrorCode, HEX, Logger;
var init_lib = __esm({
  "../../node_modules/@ethersproject/logger/lib.esm/index.js"() {
    "use strict";
    init_version();
    _permanentCensorErrors = false;
    _censorErrors = false;
    LogLevels = { debug: 1, "default": 2, info: 2, warning: 3, error: 4, off: 5 };
    _logLevel = LogLevels["default"];
    _globalLogger = null;
    _normalizeError = _checkNormalize();
    (function(LogLevel2) {
      LogLevel2["DEBUG"] = "DEBUG";
      LogLevel2["INFO"] = "INFO";
      LogLevel2["WARNING"] = "WARNING";
      LogLevel2["ERROR"] = "ERROR";
      LogLevel2["OFF"] = "OFF";
    })(LogLevel || (LogLevel = {}));
    (function(ErrorCode2) {
      ErrorCode2["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
      ErrorCode2["NOT_IMPLEMENTED"] = "NOT_IMPLEMENTED";
      ErrorCode2["UNSUPPORTED_OPERATION"] = "UNSUPPORTED_OPERATION";
      ErrorCode2["NETWORK_ERROR"] = "NETWORK_ERROR";
      ErrorCode2["SERVER_ERROR"] = "SERVER_ERROR";
      ErrorCode2["TIMEOUT"] = "TIMEOUT";
      ErrorCode2["BUFFER_OVERRUN"] = "BUFFER_OVERRUN";
      ErrorCode2["NUMERIC_FAULT"] = "NUMERIC_FAULT";
      ErrorCode2["MISSING_NEW"] = "MISSING_NEW";
      ErrorCode2["INVALID_ARGUMENT"] = "INVALID_ARGUMENT";
      ErrorCode2["MISSING_ARGUMENT"] = "MISSING_ARGUMENT";
      ErrorCode2["UNEXPECTED_ARGUMENT"] = "UNEXPECTED_ARGUMENT";
      ErrorCode2["CALL_EXCEPTION"] = "CALL_EXCEPTION";
      ErrorCode2["INSUFFICIENT_FUNDS"] = "INSUFFICIENT_FUNDS";
      ErrorCode2["NONCE_EXPIRED"] = "NONCE_EXPIRED";
      ErrorCode2["REPLACEMENT_UNDERPRICED"] = "REPLACEMENT_UNDERPRICED";
      ErrorCode2["UNPREDICTABLE_GAS_LIMIT"] = "UNPREDICTABLE_GAS_LIMIT";
      ErrorCode2["TRANSACTION_REPLACED"] = "TRANSACTION_REPLACED";
      ErrorCode2["ACTION_REJECTED"] = "ACTION_REJECTED";
    })(ErrorCode || (ErrorCode = {}));
    HEX = "0123456789abcdef";
    Logger = class _Logger {
      constructor(version23) {
        Object.defineProperty(this, "version", {
          enumerable: true,
          value: version23,
          writable: false
        });
      }
      _log(logLevel, args) {
        const level = logLevel.toLowerCase();
        if (LogLevels[level] == null) {
          this.throwArgumentError("invalid log level name", "logLevel", logLevel);
        }
        if (_logLevel > LogLevels[level]) {
          return;
        }
        console.log.apply(console, args);
      }
      debug(...args) {
        this._log(_Logger.levels.DEBUG, args);
      }
      info(...args) {
        this._log(_Logger.levels.INFO, args);
      }
      warn(...args) {
        this._log(_Logger.levels.WARNING, args);
      }
      makeError(message, code, params) {
        if (_censorErrors) {
          return this.makeError("censored error", code, {});
        }
        if (!code) {
          code = _Logger.errors.UNKNOWN_ERROR;
        }
        if (!params) {
          params = {};
        }
        const messageDetails = [];
        Object.keys(params).forEach((key2) => {
          const value = params[key2];
          try {
            if (value instanceof Uint8Array) {
              let hex = "";
              for (let i = 0; i < value.length; i++) {
                hex += HEX[value[i] >> 4];
                hex += HEX[value[i] & 15];
              }
              messageDetails.push(key2 + "=Uint8Array(0x" + hex + ")");
            } else {
              messageDetails.push(key2 + "=" + JSON.stringify(value));
            }
          } catch (error2) {
            messageDetails.push(key2 + "=" + JSON.stringify(params[key2].toString()));
          }
        });
        messageDetails.push(`code=${code}`);
        messageDetails.push(`version=${this.version}`);
        const reason = message;
        let url = "";
        switch (code) {
          case ErrorCode.NUMERIC_FAULT: {
            url = "NUMERIC_FAULT";
            const fault = message;
            switch (fault) {
              case "overflow":
              case "underflow":
              case "division-by-zero":
                url += "-" + fault;
                break;
              case "negative-power":
              case "negative-width":
                url += "-unsupported";
                break;
              case "unbound-bitwise-result":
                url += "-unbound-result";
                break;
            }
            break;
          }
          case ErrorCode.CALL_EXCEPTION:
          case ErrorCode.INSUFFICIENT_FUNDS:
          case ErrorCode.MISSING_NEW:
          case ErrorCode.NONCE_EXPIRED:
          case ErrorCode.REPLACEMENT_UNDERPRICED:
          case ErrorCode.TRANSACTION_REPLACED:
          case ErrorCode.UNPREDICTABLE_GAS_LIMIT:
            url = code;
            break;
        }
        if (url) {
          message += " [ See: https://links.ethers.org/v5-errors-" + url + " ]";
        }
        if (messageDetails.length) {
          message += " (" + messageDetails.join(", ") + ")";
        }
        const error = new Error(message);
        error.reason = reason;
        error.code = code;
        Object.keys(params).forEach(function(key2) {
          error[key2] = params[key2];
        });
        return error;
      }
      throwError(message, code, params) {
        throw this.makeError(message, code, params);
      }
      throwArgumentError(message, name, value) {
        return this.throwError(message, _Logger.errors.INVALID_ARGUMENT, {
          argument: name,
          value
        });
      }
      assert(condition, message, code, params) {
        if (!!condition) {
          return;
        }
        this.throwError(message, code, params);
      }
      assertArgument(condition, message, name, value) {
        if (!!condition) {
          return;
        }
        this.throwArgumentError(message, name, value);
      }
      checkNormalize(message) {
        if (message == null) {
          message = "platform missing String.prototype.normalize";
        }
        if (_normalizeError) {
          this.throwError("platform missing String.prototype.normalize", _Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "String.prototype.normalize",
            form: _normalizeError
          });
        }
      }
      checkSafeUint53(value, message) {
        if (typeof value !== "number") {
          return;
        }
        if (message == null) {
          message = "value not safe";
        }
        if (value < 0 || value >= 9007199254740991) {
          this.throwError(message, _Logger.errors.NUMERIC_FAULT, {
            operation: "checkSafeInteger",
            fault: "out-of-safe-range",
            value
          });
        }
        if (value % 1) {
          this.throwError(message, _Logger.errors.NUMERIC_FAULT, {
            operation: "checkSafeInteger",
            fault: "non-integer",
            value
          });
        }
      }
      checkArgumentCount(count, expectedCount, message) {
        if (message) {
          message = ": " + message;
        } else {
          message = "";
        }
        if (count < expectedCount) {
          this.throwError("missing argument" + message, _Logger.errors.MISSING_ARGUMENT, {
            count,
            expectedCount
          });
        }
        if (count > expectedCount) {
          this.throwError("too many arguments" + message, _Logger.errors.UNEXPECTED_ARGUMENT, {
            count,
            expectedCount
          });
        }
      }
      checkNew(target, kind) {
        if (target === Object || target == null) {
          this.throwError("missing new", _Logger.errors.MISSING_NEW, { name: kind.name });
        }
      }
      checkAbstract(target, kind) {
        if (target === kind) {
          this.throwError("cannot instantiate abstract class " + JSON.stringify(kind.name) + " directly; use a sub-class", _Logger.errors.UNSUPPORTED_OPERATION, { name: target.name, operation: "new" });
        } else if (target === Object || target == null) {
          this.throwError("missing new", _Logger.errors.MISSING_NEW, { name: kind.name });
        }
      }
      static globalLogger() {
        if (!_globalLogger) {
          _globalLogger = new _Logger(version);
        }
        return _globalLogger;
      }
      static setCensorship(censorship, permanent) {
        if (!censorship && permanent) {
          this.globalLogger().throwError("cannot permanently disable censorship", _Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "setCensorship"
          });
        }
        if (_permanentCensorErrors) {
          if (!censorship) {
            return;
          }
          this.globalLogger().throwError("error censorship permanent", _Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "setCensorship"
          });
        }
        _censorErrors = !!censorship;
        _permanentCensorErrors = !!permanent;
      }
      static setLogLevel(logLevel) {
        const level = LogLevels[logLevel.toLowerCase()];
        if (level == null) {
          _Logger.globalLogger().warn("invalid log level - " + logLevel);
          return;
        }
        _logLevel = level;
      }
      static from(version23) {
        return new _Logger(version23);
      }
    };
    Logger.errors = ErrorCode;
    Logger.levels = LogLevel;
  }
});

// ../../node_modules/@ethersproject/bytes/lib.esm/_version.js
var version2;
var init_version2 = __esm({
  "../../node_modules/@ethersproject/bytes/lib.esm/_version.js"() {
    "use strict";
    version2 = "bytes/5.8.0";
  }
});

// ../../node_modules/@ethersproject/bytes/lib.esm/index.js
var lib_exports2 = {};
__export(lib_exports2, {
  arrayify: () => arrayify,
  concat: () => concat,
  hexConcat: () => hexConcat,
  hexDataLength: () => hexDataLength,
  hexDataSlice: () => hexDataSlice,
  hexStripZeros: () => hexStripZeros,
  hexValue: () => hexValue,
  hexZeroPad: () => hexZeroPad,
  hexlify: () => hexlify,
  isBytes: () => isBytes,
  isBytesLike: () => isBytesLike,
  isHexString: () => isHexString,
  joinSignature: () => joinSignature,
  splitSignature: () => splitSignature,
  stripZeros: () => stripZeros,
  zeroPad: () => zeroPad
});
function isHexable(value) {
  return !!value.toHexString;
}
function addSlice(array) {
  if (array.slice) {
    return array;
  }
  array.slice = function() {
    const args = Array.prototype.slice.call(arguments);
    return addSlice(new Uint8Array(Array.prototype.slice.apply(array, args)));
  };
  return array;
}
function isBytesLike(value) {
  return isHexString(value) && !(value.length % 2) || isBytes(value);
}
function isInteger(value) {
  return typeof value === "number" && value == value && value % 1 === 0;
}
function isBytes(value) {
  if (value == null) {
    return false;
  }
  if (value.constructor === Uint8Array) {
    return true;
  }
  if (typeof value === "string") {
    return false;
  }
  if (!isInteger(value.length) || value.length < 0) {
    return false;
  }
  for (let i = 0; i < value.length; i++) {
    const v = value[i];
    if (!isInteger(v) || v < 0 || v >= 256) {
      return false;
    }
  }
  return true;
}
function arrayify(value, options) {
  if (!options) {
    options = {};
  }
  if (typeof value === "number") {
    logger.checkSafeUint53(value, "invalid arrayify value");
    const result = [];
    while (value) {
      result.unshift(value & 255);
      value = parseInt(String(value / 256));
    }
    if (result.length === 0) {
      result.push(0);
    }
    return addSlice(new Uint8Array(result));
  }
  if (options.allowMissingPrefix && typeof value === "string" && value.substring(0, 2) !== "0x") {
    value = "0x" + value;
  }
  if (isHexable(value)) {
    value = value.toHexString();
  }
  if (isHexString(value)) {
    let hex = value.substring(2);
    if (hex.length % 2) {
      if (options.hexPad === "left") {
        hex = "0" + hex;
      } else if (options.hexPad === "right") {
        hex += "0";
      } else {
        logger.throwArgumentError("hex data is odd-length", "value", value);
      }
    }
    const result = [];
    for (let i = 0; i < hex.length; i += 2) {
      result.push(parseInt(hex.substring(i, i + 2), 16));
    }
    return addSlice(new Uint8Array(result));
  }
  if (isBytes(value)) {
    return addSlice(new Uint8Array(value));
  }
  return logger.throwArgumentError("invalid arrayify value", "value", value);
}
function concat(items) {
  const objects = items.map((item) => arrayify(item));
  const length = objects.reduce((accum, item) => accum + item.length, 0);
  const result = new Uint8Array(length);
  objects.reduce((offset, object) => {
    result.set(object, offset);
    return offset + object.length;
  }, 0);
  return addSlice(result);
}
function stripZeros(value) {
  let result = arrayify(value);
  if (result.length === 0) {
    return result;
  }
  let start = 0;
  while (start < result.length && result[start] === 0) {
    start++;
  }
  if (start) {
    result = result.slice(start);
  }
  return result;
}
function zeroPad(value, length) {
  value = arrayify(value);
  if (value.length > length) {
    logger.throwArgumentError("value out of range", "value", arguments[0]);
  }
  const result = new Uint8Array(length);
  result.set(value, length - value.length);
  return addSlice(result);
}
function isHexString(value, length) {
  if (typeof value !== "string" || !value.match(/^0x[0-9A-Fa-f]*$/)) {
    return false;
  }
  if (length && value.length !== 2 + 2 * length) {
    return false;
  }
  return true;
}
function hexlify(value, options) {
  if (!options) {
    options = {};
  }
  if (typeof value === "number") {
    logger.checkSafeUint53(value, "invalid hexlify value");
    let hex = "";
    while (value) {
      hex = HexCharacters[value & 15] + hex;
      value = Math.floor(value / 16);
    }
    if (hex.length) {
      if (hex.length % 2) {
        hex = "0" + hex;
      }
      return "0x" + hex;
    }
    return "0x00";
  }
  if (typeof value === "bigint") {
    value = value.toString(16);
    if (value.length % 2) {
      return "0x0" + value;
    }
    return "0x" + value;
  }
  if (options.allowMissingPrefix && typeof value === "string" && value.substring(0, 2) !== "0x") {
    value = "0x" + value;
  }
  if (isHexable(value)) {
    return value.toHexString();
  }
  if (isHexString(value)) {
    if (value.length % 2) {
      if (options.hexPad === "left") {
        value = "0x0" + value.substring(2);
      } else if (options.hexPad === "right") {
        value += "0";
      } else {
        logger.throwArgumentError("hex data is odd-length", "value", value);
      }
    }
    return value.toLowerCase();
  }
  if (isBytes(value)) {
    let result = "0x";
    for (let i = 0; i < value.length; i++) {
      let v = value[i];
      result += HexCharacters[(v & 240) >> 4] + HexCharacters[v & 15];
    }
    return result;
  }
  return logger.throwArgumentError("invalid hexlify value", "value", value);
}
function hexDataLength(data) {
  if (typeof data !== "string") {
    data = hexlify(data);
  } else if (!isHexString(data) || data.length % 2) {
    return null;
  }
  return (data.length - 2) / 2;
}
function hexDataSlice(data, offset, endOffset) {
  if (typeof data !== "string") {
    data = hexlify(data);
  } else if (!isHexString(data) || data.length % 2) {
    logger.throwArgumentError("invalid hexData", "value", data);
  }
  offset = 2 + 2 * offset;
  if (endOffset != null) {
    return "0x" + data.substring(offset, 2 + 2 * endOffset);
  }
  return "0x" + data.substring(offset);
}
function hexConcat(items) {
  let result = "0x";
  items.forEach((item) => {
    result += hexlify(item).substring(2);
  });
  return result;
}
function hexValue(value) {
  const trimmed = hexStripZeros(hexlify(value, { hexPad: "left" }));
  if (trimmed === "0x") {
    return "0x0";
  }
  return trimmed;
}
function hexStripZeros(value) {
  if (typeof value !== "string") {
    value = hexlify(value);
  }
  if (!isHexString(value)) {
    logger.throwArgumentError("invalid hex string", "value", value);
  }
  value = value.substring(2);
  let offset = 0;
  while (offset < value.length && value[offset] === "0") {
    offset++;
  }
  return "0x" + value.substring(offset);
}
function hexZeroPad(value, length) {
  if (typeof value !== "string") {
    value = hexlify(value);
  } else if (!isHexString(value)) {
    logger.throwArgumentError("invalid hex string", "value", value);
  }
  if (value.length > 2 * length + 2) {
    logger.throwArgumentError("value out of range", "value", arguments[1]);
  }
  while (value.length < 2 * length + 2) {
    value = "0x0" + value.substring(2);
  }
  return value;
}
function splitSignature(signature2) {
  const result = {
    r: "0x",
    s: "0x",
    _vs: "0x",
    recoveryParam: 0,
    v: 0,
    yParityAndS: "0x",
    compact: "0x"
  };
  if (isBytesLike(signature2)) {
    let bytes = arrayify(signature2);
    if (bytes.length === 64) {
      result.v = 27 + (bytes[32] >> 7);
      bytes[32] &= 127;
      result.r = hexlify(bytes.slice(0, 32));
      result.s = hexlify(bytes.slice(32, 64));
    } else if (bytes.length === 65) {
      result.r = hexlify(bytes.slice(0, 32));
      result.s = hexlify(bytes.slice(32, 64));
      result.v = bytes[64];
    } else {
      logger.throwArgumentError("invalid signature string", "signature", signature2);
    }
    if (result.v < 27) {
      if (result.v === 0 || result.v === 1) {
        result.v += 27;
      } else {
        logger.throwArgumentError("signature invalid v byte", "signature", signature2);
      }
    }
    result.recoveryParam = 1 - result.v % 2;
    if (result.recoveryParam) {
      bytes[32] |= 128;
    }
    result._vs = hexlify(bytes.slice(32, 64));
  } else {
    result.r = signature2.r;
    result.s = signature2.s;
    result.v = signature2.v;
    result.recoveryParam = signature2.recoveryParam;
    result._vs = signature2._vs;
    if (result._vs != null) {
      const vs2 = zeroPad(arrayify(result._vs), 32);
      result._vs = hexlify(vs2);
      const recoveryParam = vs2[0] >= 128 ? 1 : 0;
      if (result.recoveryParam == null) {
        result.recoveryParam = recoveryParam;
      } else if (result.recoveryParam !== recoveryParam) {
        logger.throwArgumentError("signature recoveryParam mismatch _vs", "signature", signature2);
      }
      vs2[0] &= 127;
      const s = hexlify(vs2);
      if (result.s == null) {
        result.s = s;
      } else if (result.s !== s) {
        logger.throwArgumentError("signature v mismatch _vs", "signature", signature2);
      }
    }
    if (result.recoveryParam == null) {
      if (result.v == null) {
        logger.throwArgumentError("signature missing v and recoveryParam", "signature", signature2);
      } else if (result.v === 0 || result.v === 1) {
        result.recoveryParam = result.v;
      } else {
        result.recoveryParam = 1 - result.v % 2;
      }
    } else {
      if (result.v == null) {
        result.v = 27 + result.recoveryParam;
      } else {
        const recId = result.v === 0 || result.v === 1 ? result.v : 1 - result.v % 2;
        if (result.recoveryParam !== recId) {
          logger.throwArgumentError("signature recoveryParam mismatch v", "signature", signature2);
        }
      }
    }
    if (result.r == null || !isHexString(result.r)) {
      logger.throwArgumentError("signature missing or invalid r", "signature", signature2);
    } else {
      result.r = hexZeroPad(result.r, 32);
    }
    if (result.s == null || !isHexString(result.s)) {
      logger.throwArgumentError("signature missing or invalid s", "signature", signature2);
    } else {
      result.s = hexZeroPad(result.s, 32);
    }
    const vs = arrayify(result.s);
    if (vs[0] >= 128) {
      logger.throwArgumentError("signature s out of range", "signature", signature2);
    }
    if (result.recoveryParam) {
      vs[0] |= 128;
    }
    const _vs = hexlify(vs);
    if (result._vs) {
      if (!isHexString(result._vs)) {
        logger.throwArgumentError("signature invalid _vs", "signature", signature2);
      }
      result._vs = hexZeroPad(result._vs, 32);
    }
    if (result._vs == null) {
      result._vs = _vs;
    } else if (result._vs !== _vs) {
      logger.throwArgumentError("signature _vs mismatch v and s", "signature", signature2);
    }
  }
  result.yParityAndS = result._vs;
  result.compact = result.r + result.yParityAndS.substring(2);
  return result;
}
function joinSignature(signature2) {
  signature2 = splitSignature(signature2);
  return hexlify(concat([
    signature2.r,
    signature2.s,
    signature2.recoveryParam ? "0x1c" : "0x1b"
  ]));
}
var logger, HexCharacters;
var init_lib2 = __esm({
  "../../node_modules/@ethersproject/bytes/lib.esm/index.js"() {
    "use strict";
    init_lib();
    init_version2();
    logger = new Logger(version2);
    HexCharacters = "0123456789abcdef";
  }
});

// ../../node_modules/@ethersproject/bignumber/lib.esm/_version.js
var version3;
var init_version3 = __esm({
  "../../node_modules/@ethersproject/bignumber/lib.esm/_version.js"() {
    "use strict";
    version3 = "bignumber/5.8.0";
  }
});

// ../../node_modules/@ethersproject/bignumber/lib.esm/bignumber.js
function isBigNumberish(value) {
  return value != null && (BigNumber.isBigNumber(value) || typeof value === "number" && value % 1 === 0 || typeof value === "string" && !!value.match(/^-?[0-9]+$/) || isHexString(value) || typeof value === "bigint" || isBytes(value));
}
function toHex(value) {
  if (typeof value !== "string") {
    return toHex(value.toString(16));
  }
  if (value[0] === "-") {
    value = value.substring(1);
    if (value[0] === "-") {
      logger2.throwArgumentError("invalid hex", "value", value);
    }
    value = toHex(value);
    if (value === "0x00") {
      return value;
    }
    return "-" + value;
  }
  if (value.substring(0, 2) !== "0x") {
    value = "0x" + value;
  }
  if (value === "0x") {
    return "0x00";
  }
  if (value.length % 2) {
    value = "0x0" + value.substring(2);
  }
  while (value.length > 4 && value.substring(0, 4) === "0x00") {
    value = "0x" + value.substring(4);
  }
  return value;
}
function toBigNumber(value) {
  return BigNumber.from(toHex(value));
}
function toBN(value) {
  const hex = BigNumber.from(value).toHexString();
  if (hex[0] === "-") {
    return new BN("-" + hex.substring(3), 16);
  }
  return new BN(hex.substring(2), 16);
}
function throwFault(fault, operation, value) {
  const params = { fault, operation };
  if (value != null) {
    params.value = value;
  }
  return logger2.throwError(fault, Logger.errors.NUMERIC_FAULT, params);
}
function _base36To16(value) {
  return new BN(value, 36).toString(16);
}
function _base16To36(value) {
  return new BN(value, 16).toString(36);
}
var import_bn, BN, logger2, _constructorGuard, MAX_SAFE, _warnedToStringRadix, BigNumber;
var init_bignumber = __esm({
  "../../node_modules/@ethersproject/bignumber/lib.esm/bignumber.js"() {
    "use strict";
    import_bn = __toESM(require_bn());
    init_lib2();
    init_lib();
    init_version3();
    BN = import_bn.default.BN;
    logger2 = new Logger(version3);
    _constructorGuard = {};
    MAX_SAFE = 9007199254740991;
    _warnedToStringRadix = false;
    BigNumber = class _BigNumber {
      constructor(constructorGuard, hex) {
        if (constructorGuard !== _constructorGuard) {
          logger2.throwError("cannot call constructor directly; use BigNumber.from", Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "new (BigNumber)"
          });
        }
        this._hex = hex;
        this._isBigNumber = true;
        Object.freeze(this);
      }
      fromTwos(value) {
        return toBigNumber(toBN(this).fromTwos(value));
      }
      toTwos(value) {
        return toBigNumber(toBN(this).toTwos(value));
      }
      abs() {
        if (this._hex[0] === "-") {
          return _BigNumber.from(this._hex.substring(1));
        }
        return this;
      }
      add(other) {
        return toBigNumber(toBN(this).add(toBN(other)));
      }
      sub(other) {
        return toBigNumber(toBN(this).sub(toBN(other)));
      }
      div(other) {
        const o = _BigNumber.from(other);
        if (o.isZero()) {
          throwFault("division-by-zero", "div");
        }
        return toBigNumber(toBN(this).div(toBN(other)));
      }
      mul(other) {
        return toBigNumber(toBN(this).mul(toBN(other)));
      }
      mod(other) {
        const value = toBN(other);
        if (value.isNeg()) {
          throwFault("division-by-zero", "mod");
        }
        return toBigNumber(toBN(this).umod(value));
      }
      pow(other) {
        const value = toBN(other);
        if (value.isNeg()) {
          throwFault("negative-power", "pow");
        }
        return toBigNumber(toBN(this).pow(value));
      }
      and(other) {
        const value = toBN(other);
        if (this.isNegative() || value.isNeg()) {
          throwFault("unbound-bitwise-result", "and");
        }
        return toBigNumber(toBN(this).and(value));
      }
      or(other) {
        const value = toBN(other);
        if (this.isNegative() || value.isNeg()) {
          throwFault("unbound-bitwise-result", "or");
        }
        return toBigNumber(toBN(this).or(value));
      }
      xor(other) {
        const value = toBN(other);
        if (this.isNegative() || value.isNeg()) {
          throwFault("unbound-bitwise-result", "xor");
        }
        return toBigNumber(toBN(this).xor(value));
      }
      mask(value) {
        if (this.isNegative() || value < 0) {
          throwFault("negative-width", "mask");
        }
        return toBigNumber(toBN(this).maskn(value));
      }
      shl(value) {
        if (this.isNegative() || value < 0) {
          throwFault("negative-width", "shl");
        }
        return toBigNumber(toBN(this).shln(value));
      }
      shr(value) {
        if (this.isNegative() || value < 0) {
          throwFault("negative-width", "shr");
        }
        return toBigNumber(toBN(this).shrn(value));
      }
      eq(other) {
        return toBN(this).eq(toBN(other));
      }
      lt(other) {
        return toBN(this).lt(toBN(other));
      }
      lte(other) {
        return toBN(this).lte(toBN(other));
      }
      gt(other) {
        return toBN(this).gt(toBN(other));
      }
      gte(other) {
        return toBN(this).gte(toBN(other));
      }
      isNegative() {
        return this._hex[0] === "-";
      }
      isZero() {
        return toBN(this).isZero();
      }
      toNumber() {
        try {
          return toBN(this).toNumber();
        } catch (error) {
          throwFault("overflow", "toNumber", this.toString());
        }
        return null;
      }
      toBigInt() {
        try {
          return BigInt(this.toString());
        } catch (e) {
        }
        return logger2.throwError("this platform does not support BigInt", Logger.errors.UNSUPPORTED_OPERATION, {
          value: this.toString()
        });
      }
      toString() {
        if (arguments.length > 0) {
          if (arguments[0] === 10) {
            if (!_warnedToStringRadix) {
              _warnedToStringRadix = true;
              logger2.warn("BigNumber.toString does not accept any parameters; base-10 is assumed");
            }
          } else if (arguments[0] === 16) {
            logger2.throwError("BigNumber.toString does not accept any parameters; use bigNumber.toHexString()", Logger.errors.UNEXPECTED_ARGUMENT, {});
          } else {
            logger2.throwError("BigNumber.toString does not accept parameters", Logger.errors.UNEXPECTED_ARGUMENT, {});
          }
        }
        return toBN(this).toString(10);
      }
      toHexString() {
        return this._hex;
      }
      toJSON(key2) {
        return { type: "BigNumber", hex: this.toHexString() };
      }
      static from(value) {
        if (value instanceof _BigNumber) {
          return value;
        }
        if (typeof value === "string") {
          if (value.match(/^-?0x[0-9a-f]+$/i)) {
            return new _BigNumber(_constructorGuard, toHex(value));
          }
          if (value.match(/^-?[0-9]+$/)) {
            return new _BigNumber(_constructorGuard, toHex(new BN(value)));
          }
          return logger2.throwArgumentError("invalid BigNumber string", "value", value);
        }
        if (typeof value === "number") {
          if (value % 1) {
            throwFault("underflow", "BigNumber.from", value);
          }
          if (value >= MAX_SAFE || value <= -MAX_SAFE) {
            throwFault("overflow", "BigNumber.from", value);
          }
          return _BigNumber.from(String(value));
        }
        const anyValue = value;
        if (typeof anyValue === "bigint") {
          return _BigNumber.from(anyValue.toString());
        }
        if (isBytes(anyValue)) {
          return _BigNumber.from(hexlify(anyValue));
        }
        if (anyValue) {
          if (anyValue.toHexString) {
            const hex = anyValue.toHexString();
            if (typeof hex === "string") {
              return _BigNumber.from(hex);
            }
          } else {
            let hex = anyValue._hex;
            if (hex == null && anyValue.type === "BigNumber") {
              hex = anyValue.hex;
            }
            if (typeof hex === "string") {
              if (isHexString(hex) || hex[0] === "-" && isHexString(hex.substring(1))) {
                return _BigNumber.from(hex);
              }
            }
          }
        }
        return logger2.throwArgumentError("invalid BigNumber value", "value", value);
      }
      static isBigNumber(value) {
        return !!(value && value._isBigNumber);
      }
    };
  }
});

// ../../node_modules/@ethersproject/bignumber/lib.esm/fixednumber.js
function throwFault2(message, fault, operation, value) {
  const params = { fault, operation };
  if (value !== void 0) {
    params.value = value;
  }
  return logger3.throwError(message, Logger.errors.NUMERIC_FAULT, params);
}
function getMultiplier(decimals) {
  if (typeof decimals !== "number") {
    try {
      decimals = BigNumber.from(decimals).toNumber();
    } catch (e) {
    }
  }
  if (typeof decimals === "number" && decimals >= 0 && decimals <= 256 && !(decimals % 1)) {
    return "1" + zeros.substring(0, decimals);
  }
  return logger3.throwArgumentError("invalid decimal size", "decimals", decimals);
}
function formatFixed(value, decimals) {
  if (decimals == null) {
    decimals = 0;
  }
  const multiplier = getMultiplier(decimals);
  value = BigNumber.from(value);
  const negative = value.lt(Zero);
  if (negative) {
    value = value.mul(NegativeOne);
  }
  let fraction = value.mod(multiplier).toString();
  while (fraction.length < multiplier.length - 1) {
    fraction = "0" + fraction;
  }
  fraction = fraction.match(/^([0-9]*[1-9]|0)(0*)/)[1];
  const whole = value.div(multiplier).toString();
  if (multiplier.length === 1) {
    value = whole;
  } else {
    value = whole + "." + fraction;
  }
  if (negative) {
    value = "-" + value;
  }
  return value;
}
function parseFixed(value, decimals) {
  if (decimals == null) {
    decimals = 0;
  }
  const multiplier = getMultiplier(decimals);
  if (typeof value !== "string" || !value.match(/^-?[0-9.]+$/)) {
    logger3.throwArgumentError("invalid decimal value", "value", value);
  }
  const negative = value.substring(0, 1) === "-";
  if (negative) {
    value = value.substring(1);
  }
  if (value === ".") {
    logger3.throwArgumentError("missing value", "value", value);
  }
  const comps = value.split(".");
  if (comps.length > 2) {
    logger3.throwArgumentError("too many decimal points", "value", value);
  }
  let whole = comps[0], fraction = comps[1];
  if (!whole) {
    whole = "0";
  }
  if (!fraction) {
    fraction = "0";
  }
  while (fraction[fraction.length - 1] === "0") {
    fraction = fraction.substring(0, fraction.length - 1);
  }
  if (fraction.length > multiplier.length - 1) {
    throwFault2("fractional component exceeds decimals", "underflow", "parseFixed");
  }
  if (fraction === "") {
    fraction = "0";
  }
  while (fraction.length < multiplier.length - 1) {
    fraction += "0";
  }
  const wholeValue = BigNumber.from(whole);
  const fractionValue = BigNumber.from(fraction);
  let wei = wholeValue.mul(multiplier).add(fractionValue);
  if (negative) {
    wei = wei.mul(NegativeOne);
  }
  return wei;
}
var logger3, _constructorGuard2, Zero, NegativeOne, zeros, FixedFormat, FixedNumber, ONE, BUMP;
var init_fixednumber = __esm({
  "../../node_modules/@ethersproject/bignumber/lib.esm/fixednumber.js"() {
    "use strict";
    init_lib2();
    init_lib();
    init_version3();
    init_bignumber();
    logger3 = new Logger(version3);
    _constructorGuard2 = {};
    Zero = BigNumber.from(0);
    NegativeOne = BigNumber.from(-1);
    zeros = "0";
    while (zeros.length < 256) {
      zeros += zeros;
    }
    FixedFormat = class _FixedFormat {
      constructor(constructorGuard, signed2, width, decimals) {
        if (constructorGuard !== _constructorGuard2) {
          logger3.throwError("cannot use FixedFormat constructor; use FixedFormat.from", Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "new FixedFormat"
          });
        }
        this.signed = signed2;
        this.width = width;
        this.decimals = decimals;
        this.name = (signed2 ? "" : "u") + "fixed" + String(width) + "x" + String(decimals);
        this._multiplier = getMultiplier(decimals);
        Object.freeze(this);
      }
      static from(value) {
        if (value instanceof _FixedFormat) {
          return value;
        }
        if (typeof value === "number") {
          value = `fixed128x${value}`;
        }
        let signed2 = true;
        let width = 128;
        let decimals = 18;
        if (typeof value === "string") {
          if (value === "fixed") {
          } else if (value === "ufixed") {
            signed2 = false;
          } else {
            const match = value.match(/^(u?)fixed([0-9]+)x([0-9]+)$/);
            if (!match) {
              logger3.throwArgumentError("invalid fixed format", "format", value);
            }
            signed2 = match[1] !== "u";
            width = parseInt(match[2]);
            decimals = parseInt(match[3]);
          }
        } else if (value) {
          const check = (key2, type, defaultValue) => {
            if (value[key2] == null) {
              return defaultValue;
            }
            if (typeof value[key2] !== type) {
              logger3.throwArgumentError("invalid fixed format (" + key2 + " not " + type + ")", "format." + key2, value[key2]);
            }
            return value[key2];
          };
          signed2 = check("signed", "boolean", signed2);
          width = check("width", "number", width);
          decimals = check("decimals", "number", decimals);
        }
        if (width % 8) {
          logger3.throwArgumentError("invalid fixed format width (not byte aligned)", "format.width", width);
        }
        if (decimals > 80) {
          logger3.throwArgumentError("invalid fixed format (decimals too large)", "format.decimals", decimals);
        }
        return new _FixedFormat(_constructorGuard2, signed2, width, decimals);
      }
    };
    FixedNumber = class _FixedNumber {
      constructor(constructorGuard, hex, value, format) {
        if (constructorGuard !== _constructorGuard2) {
          logger3.throwError("cannot use FixedNumber constructor; use FixedNumber.from", Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "new FixedFormat"
          });
        }
        this.format = format;
        this._hex = hex;
        this._value = value;
        this._isFixedNumber = true;
        Object.freeze(this);
      }
      _checkFormat(other) {
        if (this.format.name !== other.format.name) {
          logger3.throwArgumentError("incompatible format; use fixedNumber.toFormat", "other", other);
        }
      }
      addUnsafe(other) {
        this._checkFormat(other);
        const a = parseFixed(this._value, this.format.decimals);
        const b = parseFixed(other._value, other.format.decimals);
        return _FixedNumber.fromValue(a.add(b), this.format.decimals, this.format);
      }
      subUnsafe(other) {
        this._checkFormat(other);
        const a = parseFixed(this._value, this.format.decimals);
        const b = parseFixed(other._value, other.format.decimals);
        return _FixedNumber.fromValue(a.sub(b), this.format.decimals, this.format);
      }
      mulUnsafe(other) {
        this._checkFormat(other);
        const a = parseFixed(this._value, this.format.decimals);
        const b = parseFixed(other._value, other.format.decimals);
        return _FixedNumber.fromValue(a.mul(b).div(this.format._multiplier), this.format.decimals, this.format);
      }
      divUnsafe(other) {
        this._checkFormat(other);
        const a = parseFixed(this._value, this.format.decimals);
        const b = parseFixed(other._value, other.format.decimals);
        return _FixedNumber.fromValue(a.mul(this.format._multiplier).div(b), this.format.decimals, this.format);
      }
      floor() {
        const comps = this.toString().split(".");
        if (comps.length === 1) {
          comps.push("0");
        }
        let result = _FixedNumber.from(comps[0], this.format);
        const hasFraction = !comps[1].match(/^(0*)$/);
        if (this.isNegative() && hasFraction) {
          result = result.subUnsafe(ONE.toFormat(result.format));
        }
        return result;
      }
      ceiling() {
        const comps = this.toString().split(".");
        if (comps.length === 1) {
          comps.push("0");
        }
        let result = _FixedNumber.from(comps[0], this.format);
        const hasFraction = !comps[1].match(/^(0*)$/);
        if (!this.isNegative() && hasFraction) {
          result = result.addUnsafe(ONE.toFormat(result.format));
        }
        return result;
      }
      // @TODO: Support other rounding algorithms
      round(decimals) {
        if (decimals == null) {
          decimals = 0;
        }
        const comps = this.toString().split(".");
        if (comps.length === 1) {
          comps.push("0");
        }
        if (decimals < 0 || decimals > 80 || decimals % 1) {
          logger3.throwArgumentError("invalid decimal count", "decimals", decimals);
        }
        if (comps[1].length <= decimals) {
          return this;
        }
        const factor = _FixedNumber.from("1" + zeros.substring(0, decimals), this.format);
        const bump = BUMP.toFormat(this.format);
        return this.mulUnsafe(factor).addUnsafe(bump).floor().divUnsafe(factor);
      }
      isZero() {
        return this._value === "0.0" || this._value === "0";
      }
      isNegative() {
        return this._value[0] === "-";
      }
      toString() {
        return this._value;
      }
      toHexString(width) {
        if (width == null) {
          return this._hex;
        }
        if (width % 8) {
          logger3.throwArgumentError("invalid byte width", "width", width);
        }
        const hex = BigNumber.from(this._hex).fromTwos(this.format.width).toTwos(width).toHexString();
        return hexZeroPad(hex, width / 8);
      }
      toUnsafeFloat() {
        return parseFloat(this.toString());
      }
      toFormat(format) {
        return _FixedNumber.fromString(this._value, format);
      }
      static fromValue(value, decimals, format) {
        if (format == null && decimals != null && !isBigNumberish(decimals)) {
          format = decimals;
          decimals = null;
        }
        if (decimals == null) {
          decimals = 0;
        }
        if (format == null) {
          format = "fixed";
        }
        return _FixedNumber.fromString(formatFixed(value, decimals), FixedFormat.from(format));
      }
      static fromString(value, format) {
        if (format == null) {
          format = "fixed";
        }
        const fixedFormat = FixedFormat.from(format);
        const numeric = parseFixed(value, fixedFormat.decimals);
        if (!fixedFormat.signed && numeric.lt(Zero)) {
          throwFault2("unsigned value cannot be negative", "overflow", "value", value);
        }
        let hex = null;
        if (fixedFormat.signed) {
          hex = numeric.toTwos(fixedFormat.width).toHexString();
        } else {
          hex = numeric.toHexString();
          hex = hexZeroPad(hex, fixedFormat.width / 8);
        }
        const decimal = formatFixed(numeric, fixedFormat.decimals);
        return new _FixedNumber(_constructorGuard2, hex, decimal, fixedFormat);
      }
      static fromBytes(value, format) {
        if (format == null) {
          format = "fixed";
        }
        const fixedFormat = FixedFormat.from(format);
        if (arrayify(value).length > fixedFormat.width / 8) {
          throw new Error("overflow");
        }
        let numeric = BigNumber.from(value);
        if (fixedFormat.signed) {
          numeric = numeric.fromTwos(fixedFormat.width);
        }
        const hex = numeric.toTwos((fixedFormat.signed ? 0 : 1) + fixedFormat.width).toHexString();
        const decimal = formatFixed(numeric, fixedFormat.decimals);
        return new _FixedNumber(_constructorGuard2, hex, decimal, fixedFormat);
      }
      static from(value, format) {
        if (typeof value === "string") {
          return _FixedNumber.fromString(value, format);
        }
        if (isBytes(value)) {
          return _FixedNumber.fromBytes(value, format);
        }
        try {
          return _FixedNumber.fromValue(value, 0, format);
        } catch (error) {
          if (error.code !== Logger.errors.INVALID_ARGUMENT) {
            throw error;
          }
        }
        return logger3.throwArgumentError("invalid FixedNumber value", "value", value);
      }
      static isFixedNumber(value) {
        return !!(value && value._isFixedNumber);
      }
    };
    ONE = FixedNumber.from(1);
    BUMP = FixedNumber.from("0.5");
  }
});

// ../../node_modules/@ethersproject/bignumber/lib.esm/index.js
var init_lib3 = __esm({
  "../../node_modules/@ethersproject/bignumber/lib.esm/index.js"() {
    "use strict";
    init_bignumber();
    init_fixednumber();
    init_bignumber();
  }
});

// ../../node_modules/@ethersproject/properties/lib.esm/_version.js
var version4;
var init_version4 = __esm({
  "../../node_modules/@ethersproject/properties/lib.esm/_version.js"() {
    "use strict";
    version4 = "properties/5.8.0";
  }
});

// ../../node_modules/@ethersproject/properties/lib.esm/index.js
var lib_exports3 = {};
__export(lib_exports3, {
  Description: () => Description,
  checkProperties: () => checkProperties,
  deepCopy: () => deepCopy,
  defineReadOnly: () => defineReadOnly,
  getStatic: () => getStatic,
  resolveProperties: () => resolveProperties,
  shallowCopy: () => shallowCopy
});
function defineReadOnly(object, name, value) {
  Object.defineProperty(object, name, {
    enumerable: true,
    value,
    writable: false
  });
}
function getStatic(ctor, key2) {
  for (let i = 0; i < 32; i++) {
    if (ctor[key2]) {
      return ctor[key2];
    }
    if (!ctor.prototype || typeof ctor.prototype !== "object") {
      break;
    }
    ctor = Object.getPrototypeOf(ctor.prototype).constructor;
  }
  return null;
}
function resolveProperties(object) {
  return __awaiter(this, void 0, void 0, function* () {
    const promises = Object.keys(object).map((key2) => {
      const value = object[key2];
      return Promise.resolve(value).then((v) => ({ key: key2, value: v }));
    });
    const results = yield Promise.all(promises);
    return results.reduce((accum, result) => {
      accum[result.key] = result.value;
      return accum;
    }, {});
  });
}
function checkProperties(object, properties) {
  if (!object || typeof object !== "object") {
    logger4.throwArgumentError("invalid object", "object", object);
  }
  Object.keys(object).forEach((key2) => {
    if (!properties[key2]) {
      logger4.throwArgumentError("invalid object key - " + key2, "transaction:" + key2, object);
    }
  });
}
function shallowCopy(object) {
  const result = {};
  for (const key2 in object) {
    result[key2] = object[key2];
  }
  return result;
}
function _isFrozen(object) {
  if (object === void 0 || object === null || opaque[typeof object]) {
    return true;
  }
  if (Array.isArray(object) || typeof object === "object") {
    if (!Object.isFrozen(object)) {
      return false;
    }
    const keys = Object.keys(object);
    for (let i = 0; i < keys.length; i++) {
      let value = null;
      try {
        value = object[keys[i]];
      } catch (error) {
        continue;
      }
      if (!_isFrozen(value)) {
        return false;
      }
    }
    return true;
  }
  return logger4.throwArgumentError(`Cannot deepCopy ${typeof object}`, "object", object);
}
function _deepCopy(object) {
  if (_isFrozen(object)) {
    return object;
  }
  if (Array.isArray(object)) {
    return Object.freeze(object.map((item) => deepCopy(item)));
  }
  if (typeof object === "object") {
    const result = {};
    for (const key2 in object) {
      const value = object[key2];
      if (value === void 0) {
        continue;
      }
      defineReadOnly(result, key2, deepCopy(value));
    }
    return result;
  }
  return logger4.throwArgumentError(`Cannot deepCopy ${typeof object}`, "object", object);
}
function deepCopy(object) {
  return _deepCopy(object);
}
var __awaiter, logger4, opaque, Description;
var init_lib4 = __esm({
  "../../node_modules/@ethersproject/properties/lib.esm/index.js"() {
    "use strict";
    init_lib();
    init_version4();
    __awaiter = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    logger4 = new Logger(version4);
    opaque = { bigint: true, boolean: true, "function": true, number: true, string: true };
    Description = class {
      constructor(info) {
        for (const key2 in info) {
          this[key2] = deepCopy(info[key2]);
        }
      }
    };
  }
});

// ../../node_modules/@ethersproject/abi/lib.esm/_version.js
var version5;
var init_version5 = __esm({
  "../../node_modules/@ethersproject/abi/lib.esm/_version.js"() {
    "use strict";
    version5 = "abi/5.8.0";
  }
});

// ../../node_modules/@ethersproject/abi/lib.esm/fragments.js
function checkModifier(type, name) {
  if (type === "bytes" || type === "string") {
    if (ModifiersBytes[name]) {
      return true;
    }
  } else if (type === "address") {
    if (name === "payable") {
      return true;
    }
  } else if (type.indexOf("[") >= 0 || type === "tuple") {
    if (ModifiersNest[name]) {
      return true;
    }
  }
  if (ModifiersBytes[name] || name === "payable") {
    logger5.throwArgumentError("invalid modifier", "name", name);
  }
  return false;
}
function parseParamType(param, allowIndexed) {
  let originalParam = param;
  function throwError(i) {
    logger5.throwArgumentError(`unexpected character at position ${i}`, "param", param);
  }
  param = param.replace(/\s/g, " ");
  function newNode(parent2) {
    let node2 = { type: "", name: "", parent: parent2, state: { allowType: true } };
    if (allowIndexed) {
      node2.indexed = false;
    }
    return node2;
  }
  let parent = { type: "", name: "", state: { allowType: true } };
  let node = parent;
  for (let i = 0; i < param.length; i++) {
    let c = param[i];
    switch (c) {
      case "(":
        if (node.state.allowType && node.type === "") {
          node.type = "tuple";
        } else if (!node.state.allowParams) {
          throwError(i);
        }
        node.state.allowType = false;
        node.type = verifyType(node.type);
        node.components = [newNode(node)];
        node = node.components[0];
        break;
      case ")":
        delete node.state;
        if (node.name === "indexed") {
          if (!allowIndexed) {
            throwError(i);
          }
          node.indexed = true;
          node.name = "";
        }
        if (checkModifier(node.type, node.name)) {
          node.name = "";
        }
        node.type = verifyType(node.type);
        let child = node;
        node = node.parent;
        if (!node) {
          throwError(i);
        }
        delete child.parent;
        node.state.allowParams = false;
        node.state.allowName = true;
        node.state.allowArray = true;
        break;
      case ",":
        delete node.state;
        if (node.name === "indexed") {
          if (!allowIndexed) {
            throwError(i);
          }
          node.indexed = true;
          node.name = "";
        }
        if (checkModifier(node.type, node.name)) {
          node.name = "";
        }
        node.type = verifyType(node.type);
        let sibling = newNode(node.parent);
        node.parent.components.push(sibling);
        delete node.parent;
        node = sibling;
        break;
      // Hit a space...
      case " ":
        if (node.state.allowType) {
          if (node.type !== "") {
            node.type = verifyType(node.type);
            delete node.state.allowType;
            node.state.allowName = true;
            node.state.allowParams = true;
          }
        }
        if (node.state.allowName) {
          if (node.name !== "") {
            if (node.name === "indexed") {
              if (!allowIndexed) {
                throwError(i);
              }
              if (node.indexed) {
                throwError(i);
              }
              node.indexed = true;
              node.name = "";
            } else if (checkModifier(node.type, node.name)) {
              node.name = "";
            } else {
              node.state.allowName = false;
            }
          }
        }
        break;
      case "[":
        if (!node.state.allowArray) {
          throwError(i);
        }
        node.type += c;
        node.state.allowArray = false;
        node.state.allowName = false;
        node.state.readArray = true;
        break;
      case "]":
        if (!node.state.readArray) {
          throwError(i);
        }
        node.type += c;
        node.state.readArray = false;
        node.state.allowArray = true;
        node.state.allowName = true;
        break;
      default:
        if (node.state.allowType) {
          node.type += c;
          node.state.allowParams = true;
          node.state.allowArray = true;
        } else if (node.state.allowName) {
          node.name += c;
          delete node.state.allowArray;
        } else if (node.state.readArray) {
          node.type += c;
        } else {
          throwError(i);
        }
    }
  }
  if (node.parent) {
    logger5.throwArgumentError("unexpected eof", "param", param);
  }
  delete parent.state;
  if (node.name === "indexed") {
    if (!allowIndexed) {
      throwError(originalParam.length - 7);
    }
    if (node.indexed) {
      throwError(originalParam.length - 7);
    }
    node.indexed = true;
    node.name = "";
  } else if (checkModifier(node.type, node.name)) {
    node.name = "";
  }
  parent.type = verifyType(parent.type);
  return parent;
}
function populate(object, params) {
  for (let key2 in params) {
    defineReadOnly(object, key2, params[key2]);
  }
}
function parseParams(value, allowIndex) {
  return splitNesting(value).map((param) => ParamType.fromString(param, allowIndex));
}
function parseGas(value, params) {
  params.gas = null;
  let comps = value.split("@");
  if (comps.length !== 1) {
    if (comps.length > 2) {
      logger5.throwArgumentError("invalid human-readable ABI signature", "value", value);
    }
    if (!comps[1].match(/^[0-9]+$/)) {
      logger5.throwArgumentError("invalid human-readable ABI signature gas", "value", value);
    }
    params.gas = BigNumber.from(comps[1]);
    return comps[0];
  }
  return value;
}
function parseModifiers(value, params) {
  params.constant = false;
  params.payable = false;
  params.stateMutability = "nonpayable";
  value.split(" ").forEach((modifier) => {
    switch (modifier.trim()) {
      case "constant":
        params.constant = true;
        break;
      case "payable":
        params.payable = true;
        params.stateMutability = "payable";
        break;
      case "nonpayable":
        params.payable = false;
        params.stateMutability = "nonpayable";
        break;
      case "pure":
        params.constant = true;
        params.stateMutability = "pure";
        break;
      case "view":
        params.constant = true;
        params.stateMutability = "view";
        break;
      case "external":
      case "public":
      case "":
        break;
      default:
        console.log("unknown modifier: " + modifier);
    }
  });
}
function verifyState(value) {
  let result = {
    constant: false,
    payable: true,
    stateMutability: "payable"
  };
  if (value.stateMutability != null) {
    result.stateMutability = value.stateMutability;
    result.constant = result.stateMutability === "view" || result.stateMutability === "pure";
    if (value.constant != null) {
      if (!!value.constant !== result.constant) {
        logger5.throwArgumentError("cannot have constant function with mutability " + result.stateMutability, "value", value);
      }
    }
    result.payable = result.stateMutability === "payable";
    if (value.payable != null) {
      if (!!value.payable !== result.payable) {
        logger5.throwArgumentError("cannot have payable function with mutability " + result.stateMutability, "value", value);
      }
    }
  } else if (value.payable != null) {
    result.payable = !!value.payable;
    if (value.constant == null && !result.payable && value.type !== "constructor") {
      logger5.throwArgumentError("unable to determine stateMutability", "value", value);
    }
    result.constant = !!value.constant;
    if (result.constant) {
      result.stateMutability = "view";
    } else {
      result.stateMutability = result.payable ? "payable" : "nonpayable";
    }
    if (result.payable && result.constant) {
      logger5.throwArgumentError("cannot have constant payable function", "value", value);
    }
  } else if (value.constant != null) {
    result.constant = !!value.constant;
    result.payable = !result.constant;
    result.stateMutability = result.constant ? "view" : "payable";
  } else if (value.type !== "constructor") {
    logger5.throwArgumentError("unable to determine stateMutability", "value", value);
  }
  return result;
}
function checkForbidden(fragment) {
  const sig = fragment.format();
  if (sig === "Error(string)" || sig === "Panic(uint256)") {
    logger5.throwArgumentError(`cannot specify user defined ${sig} error`, "fragment", fragment);
  }
  return fragment;
}
function verifyType(type) {
  if (type.match(/^uint($|[^1-9])/)) {
    type = "uint256" + type.substring(4);
  } else if (type.match(/^int($|[^1-9])/)) {
    type = "int256" + type.substring(3);
  }
  return type;
}
function verifyIdentifier(value) {
  if (!value || !value.match(regexIdentifier)) {
    logger5.throwArgumentError(`invalid identifier "${value}"`, "value", value);
  }
  return value;
}
function splitNesting(value) {
  value = value.trim();
  let result = [];
  let accum = "";
  let depth = 0;
  for (let offset = 0; offset < value.length; offset++) {
    let c = value[offset];
    if (c === "," && depth === 0) {
      result.push(accum);
      accum = "";
    } else {
      accum += c;
      if (c === "(") {
        depth++;
      } else if (c === ")") {
        depth--;
        if (depth === -1) {
          logger5.throwArgumentError("unbalanced parenthesis", "value", value);
        }
      }
    }
  }
  if (accum) {
    result.push(accum);
  }
  return result;
}
var logger5, _constructorGuard3, ModifiersBytes, ModifiersNest, FormatTypes, paramTypeArray, ParamType, Fragment, EventFragment, ConstructorFragment, FunctionFragment, ErrorFragment, regexIdentifier, regexParen;
var init_fragments = __esm({
  "../../node_modules/@ethersproject/abi/lib.esm/fragments.js"() {
    "use strict";
    init_lib3();
    init_lib4();
    init_lib();
    init_version5();
    logger5 = new Logger(version5);
    _constructorGuard3 = {};
    ModifiersBytes = { calldata: true, memory: true, storage: true };
    ModifiersNest = { calldata: true, memory: true };
    FormatTypes = Object.freeze({
      // Bare formatting, as is needed for computing a sighash of an event or function
      sighash: "sighash",
      // Human-Readable with Minimal spacing and without names (compact human-readable)
      minimal: "minimal",
      // Human-Readable with nice spacing, including all names
      full: "full",
      // JSON-format a la Solidity
      json: "json"
    });
    paramTypeArray = new RegExp(/^(.*)\[([0-9]*)\]$/);
    ParamType = class _ParamType {
      constructor(constructorGuard, params) {
        if (constructorGuard !== _constructorGuard3) {
          logger5.throwError("use fromString", Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "new ParamType()"
          });
        }
        populate(this, params);
        let match = this.type.match(paramTypeArray);
        if (match) {
          populate(this, {
            arrayLength: parseInt(match[2] || "-1"),
            arrayChildren: _ParamType.fromObject({
              type: match[1],
              components: this.components
            }),
            baseType: "array"
          });
        } else {
          populate(this, {
            arrayLength: null,
            arrayChildren: null,
            baseType: this.components != null ? "tuple" : this.type
          });
        }
        this._isParamType = true;
        Object.freeze(this);
      }
      // Format the parameter fragment
      //   - sighash: "(uint256,address)"
      //   - minimal: "tuple(uint256,address) indexed"
      //   - full:    "tuple(uint256 foo, address bar) indexed baz"
      format(format) {
        if (!format) {
          format = FormatTypes.sighash;
        }
        if (!FormatTypes[format]) {
          logger5.throwArgumentError("invalid format type", "format", format);
        }
        if (format === FormatTypes.json) {
          let result2 = {
            type: this.baseType === "tuple" ? "tuple" : this.type,
            name: this.name || void 0
          };
          if (typeof this.indexed === "boolean") {
            result2.indexed = this.indexed;
          }
          if (this.components) {
            result2.components = this.components.map((comp) => JSON.parse(comp.format(format)));
          }
          return JSON.stringify(result2);
        }
        let result = "";
        if (this.baseType === "array") {
          result += this.arrayChildren.format(format);
          result += "[" + (this.arrayLength < 0 ? "" : String(this.arrayLength)) + "]";
        } else {
          if (this.baseType === "tuple") {
            if (format !== FormatTypes.sighash) {
              result += this.type;
            }
            result += "(" + this.components.map((comp) => comp.format(format)).join(format === FormatTypes.full ? ", " : ",") + ")";
          } else {
            result += this.type;
          }
        }
        if (format !== FormatTypes.sighash) {
          if (this.indexed === true) {
            result += " indexed";
          }
          if (format === FormatTypes.full && this.name) {
            result += " " + this.name;
          }
        }
        return result;
      }
      static from(value, allowIndexed) {
        if (typeof value === "string") {
          return _ParamType.fromString(value, allowIndexed);
        }
        return _ParamType.fromObject(value);
      }
      static fromObject(value) {
        if (_ParamType.isParamType(value)) {
          return value;
        }
        return new _ParamType(_constructorGuard3, {
          name: value.name || null,
          type: verifyType(value.type),
          indexed: value.indexed == null ? null : !!value.indexed,
          components: value.components ? value.components.map(_ParamType.fromObject) : null
        });
      }
      static fromString(value, allowIndexed) {
        function ParamTypify(node) {
          return _ParamType.fromObject({
            name: node.name,
            type: node.type,
            indexed: node.indexed,
            components: node.components
          });
        }
        return ParamTypify(parseParamType(value, !!allowIndexed));
      }
      static isParamType(value) {
        return !!(value != null && value._isParamType);
      }
    };
    Fragment = class _Fragment {
      constructor(constructorGuard, params) {
        if (constructorGuard !== _constructorGuard3) {
          logger5.throwError("use a static from method", Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "new Fragment()"
          });
        }
        populate(this, params);
        this._isFragment = true;
        Object.freeze(this);
      }
      static from(value) {
        if (_Fragment.isFragment(value)) {
          return value;
        }
        if (typeof value === "string") {
          return _Fragment.fromString(value);
        }
        return _Fragment.fromObject(value);
      }
      static fromObject(value) {
        if (_Fragment.isFragment(value)) {
          return value;
        }
        switch (value.type) {
          case "function":
            return FunctionFragment.fromObject(value);
          case "event":
            return EventFragment.fromObject(value);
          case "constructor":
            return ConstructorFragment.fromObject(value);
          case "error":
            return ErrorFragment.fromObject(value);
          case "fallback":
          case "receive":
            return null;
        }
        return logger5.throwArgumentError("invalid fragment object", "value", value);
      }
      static fromString(value) {
        value = value.replace(/\s/g, " ");
        value = value.replace(/\(/g, " (").replace(/\)/g, ") ").replace(/\s+/g, " ");
        value = value.trim();
        if (value.split(" ")[0] === "event") {
          return EventFragment.fromString(value.substring(5).trim());
        } else if (value.split(" ")[0] === "function") {
          return FunctionFragment.fromString(value.substring(8).trim());
        } else if (value.split("(")[0].trim() === "constructor") {
          return ConstructorFragment.fromString(value.trim());
        } else if (value.split(" ")[0] === "error") {
          return ErrorFragment.fromString(value.substring(5).trim());
        }
        return logger5.throwArgumentError("unsupported fragment", "value", value);
      }
      static isFragment(value) {
        return !!(value && value._isFragment);
      }
    };
    EventFragment = class _EventFragment extends Fragment {
      format(format) {
        if (!format) {
          format = FormatTypes.sighash;
        }
        if (!FormatTypes[format]) {
          logger5.throwArgumentError("invalid format type", "format", format);
        }
        if (format === FormatTypes.json) {
          return JSON.stringify({
            type: "event",
            anonymous: this.anonymous,
            name: this.name,
            inputs: this.inputs.map((input) => JSON.parse(input.format(format)))
          });
        }
        let result = "";
        if (format !== FormatTypes.sighash) {
          result += "event ";
        }
        result += this.name + "(" + this.inputs.map((input) => input.format(format)).join(format === FormatTypes.full ? ", " : ",") + ") ";
        if (format !== FormatTypes.sighash) {
          if (this.anonymous) {
            result += "anonymous ";
          }
        }
        return result.trim();
      }
      static from(value) {
        if (typeof value === "string") {
          return _EventFragment.fromString(value);
        }
        return _EventFragment.fromObject(value);
      }
      static fromObject(value) {
        if (_EventFragment.isEventFragment(value)) {
          return value;
        }
        if (value.type !== "event") {
          logger5.throwArgumentError("invalid event object", "value", value);
        }
        const params = {
          name: verifyIdentifier(value.name),
          anonymous: value.anonymous,
          inputs: value.inputs ? value.inputs.map(ParamType.fromObject) : [],
          type: "event"
        };
        return new _EventFragment(_constructorGuard3, params);
      }
      static fromString(value) {
        let match = value.match(regexParen);
        if (!match) {
          logger5.throwArgumentError("invalid event string", "value", value);
        }
        let anonymous = false;
        match[3].split(" ").forEach((modifier) => {
          switch (modifier.trim()) {
            case "anonymous":
              anonymous = true;
              break;
            case "":
              break;
            default:
              logger5.warn("unknown modifier: " + modifier);
          }
        });
        return _EventFragment.fromObject({
          name: match[1].trim(),
          anonymous,
          inputs: parseParams(match[2], true),
          type: "event"
        });
      }
      static isEventFragment(value) {
        return value && value._isFragment && value.type === "event";
      }
    };
    ConstructorFragment = class _ConstructorFragment extends Fragment {
      format(format) {
        if (!format) {
          format = FormatTypes.sighash;
        }
        if (!FormatTypes[format]) {
          logger5.throwArgumentError("invalid format type", "format", format);
        }
        if (format === FormatTypes.json) {
          return JSON.stringify({
            type: "constructor",
            stateMutability: this.stateMutability !== "nonpayable" ? this.stateMutability : void 0,
            payable: this.payable,
            gas: this.gas ? this.gas.toNumber() : void 0,
            inputs: this.inputs.map((input) => JSON.parse(input.format(format)))
          });
        }
        if (format === FormatTypes.sighash) {
          logger5.throwError("cannot format a constructor for sighash", Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "format(sighash)"
          });
        }
        let result = "constructor(" + this.inputs.map((input) => input.format(format)).join(format === FormatTypes.full ? ", " : ",") + ") ";
        if (this.stateMutability && this.stateMutability !== "nonpayable") {
          result += this.stateMutability + " ";
        }
        return result.trim();
      }
      static from(value) {
        if (typeof value === "string") {
          return _ConstructorFragment.fromString(value);
        }
        return _ConstructorFragment.fromObject(value);
      }
      static fromObject(value) {
        if (_ConstructorFragment.isConstructorFragment(value)) {
          return value;
        }
        if (value.type !== "constructor") {
          logger5.throwArgumentError("invalid constructor object", "value", value);
        }
        let state = verifyState(value);
        if (state.constant) {
          logger5.throwArgumentError("constructor cannot be constant", "value", value);
        }
        const params = {
          name: null,
          type: value.type,
          inputs: value.inputs ? value.inputs.map(ParamType.fromObject) : [],
          payable: state.payable,
          stateMutability: state.stateMutability,
          gas: value.gas ? BigNumber.from(value.gas) : null
        };
        return new _ConstructorFragment(_constructorGuard3, params);
      }
      static fromString(value) {
        let params = { type: "constructor" };
        value = parseGas(value, params);
        let parens = value.match(regexParen);
        if (!parens || parens[1].trim() !== "constructor") {
          logger5.throwArgumentError("invalid constructor string", "value", value);
        }
        params.inputs = parseParams(parens[2].trim(), false);
        parseModifiers(parens[3].trim(), params);
        return _ConstructorFragment.fromObject(params);
      }
      static isConstructorFragment(value) {
        return value && value._isFragment && value.type === "constructor";
      }
    };
    FunctionFragment = class _FunctionFragment extends ConstructorFragment {
      format(format) {
        if (!format) {
          format = FormatTypes.sighash;
        }
        if (!FormatTypes[format]) {
          logger5.throwArgumentError("invalid format type", "format", format);
        }
        if (format === FormatTypes.json) {
          return JSON.stringify({
            type: "function",
            name: this.name,
            constant: this.constant,
            stateMutability: this.stateMutability !== "nonpayable" ? this.stateMutability : void 0,
            payable: this.payable,
            gas: this.gas ? this.gas.toNumber() : void 0,
            inputs: this.inputs.map((input) => JSON.parse(input.format(format))),
            outputs: this.outputs.map((output) => JSON.parse(output.format(format)))
          });
        }
        let result = "";
        if (format !== FormatTypes.sighash) {
          result += "function ";
        }
        result += this.name + "(" + this.inputs.map((input) => input.format(format)).join(format === FormatTypes.full ? ", " : ",") + ") ";
        if (format !== FormatTypes.sighash) {
          if (this.stateMutability) {
            if (this.stateMutability !== "nonpayable") {
              result += this.stateMutability + " ";
            }
          } else if (this.constant) {
            result += "view ";
          }
          if (this.outputs && this.outputs.length) {
            result += "returns (" + this.outputs.map((output) => output.format(format)).join(", ") + ") ";
          }
          if (this.gas != null) {
            result += "@" + this.gas.toString() + " ";
          }
        }
        return result.trim();
      }
      static from(value) {
        if (typeof value === "string") {
          return _FunctionFragment.fromString(value);
        }
        return _FunctionFragment.fromObject(value);
      }
      static fromObject(value) {
        if (_FunctionFragment.isFunctionFragment(value)) {
          return value;
        }
        if (value.type !== "function") {
          logger5.throwArgumentError("invalid function object", "value", value);
        }
        let state = verifyState(value);
        const params = {
          type: value.type,
          name: verifyIdentifier(value.name),
          constant: state.constant,
          inputs: value.inputs ? value.inputs.map(ParamType.fromObject) : [],
          outputs: value.outputs ? value.outputs.map(ParamType.fromObject) : [],
          payable: state.payable,
          stateMutability: state.stateMutability,
          gas: value.gas ? BigNumber.from(value.gas) : null
        };
        return new _FunctionFragment(_constructorGuard3, params);
      }
      static fromString(value) {
        let params = { type: "function" };
        value = parseGas(value, params);
        let comps = value.split(" returns ");
        if (comps.length > 2) {
          logger5.throwArgumentError("invalid function string", "value", value);
        }
        let parens = comps[0].match(regexParen);
        if (!parens) {
          logger5.throwArgumentError("invalid function signature", "value", value);
        }
        params.name = parens[1].trim();
        if (params.name) {
          verifyIdentifier(params.name);
        }
        params.inputs = parseParams(parens[2], false);
        parseModifiers(parens[3].trim(), params);
        if (comps.length > 1) {
          let returns = comps[1].match(regexParen);
          if (returns[1].trim() != "" || returns[3].trim() != "") {
            logger5.throwArgumentError("unexpected tokens", "value", value);
          }
          params.outputs = parseParams(returns[2], false);
        } else {
          params.outputs = [];
        }
        return _FunctionFragment.fromObject(params);
      }
      static isFunctionFragment(value) {
        return value && value._isFragment && value.type === "function";
      }
    };
    ErrorFragment = class _ErrorFragment extends Fragment {
      format(format) {
        if (!format) {
          format = FormatTypes.sighash;
        }
        if (!FormatTypes[format]) {
          logger5.throwArgumentError("invalid format type", "format", format);
        }
        if (format === FormatTypes.json) {
          return JSON.stringify({
            type: "error",
            name: this.name,
            inputs: this.inputs.map((input) => JSON.parse(input.format(format)))
          });
        }
        let result = "";
        if (format !== FormatTypes.sighash) {
          result += "error ";
        }
        result += this.name + "(" + this.inputs.map((input) => input.format(format)).join(format === FormatTypes.full ? ", " : ",") + ") ";
        return result.trim();
      }
      static from(value) {
        if (typeof value === "string") {
          return _ErrorFragment.fromString(value);
        }
        return _ErrorFragment.fromObject(value);
      }
      static fromObject(value) {
        if (_ErrorFragment.isErrorFragment(value)) {
          return value;
        }
        if (value.type !== "error") {
          logger5.throwArgumentError("invalid error object", "value", value);
        }
        const params = {
          type: value.type,
          name: verifyIdentifier(value.name),
          inputs: value.inputs ? value.inputs.map(ParamType.fromObject) : []
        };
        return checkForbidden(new _ErrorFragment(_constructorGuard3, params));
      }
      static fromString(value) {
        let params = { type: "error" };
        let parens = value.match(regexParen);
        if (!parens) {
          logger5.throwArgumentError("invalid error signature", "value", value);
        }
        params.name = parens[1].trim();
        if (params.name) {
          verifyIdentifier(params.name);
        }
        params.inputs = parseParams(parens[2], false);
        return checkForbidden(_ErrorFragment.fromObject(params));
      }
      static isErrorFragment(value) {
        return value && value._isFragment && value.type === "error";
      }
    };
    regexIdentifier = new RegExp("^[a-zA-Z$_][a-zA-Z0-9$_]*$");
    regexParen = new RegExp("^([^)(]*)\\((.*)\\)([^)(]*)$");
  }
});

// ../../node_modules/@ethersproject/abi/lib.esm/coders/abstract-coder.js
function checkResultErrors(result) {
  const errors = [];
  const checkErrors = function(path, object) {
    if (!Array.isArray(object)) {
      return;
    }
    for (let key2 in object) {
      const childPath = path.slice();
      childPath.push(key2);
      try {
        checkErrors(childPath, object[key2]);
      } catch (error) {
        errors.push({ path: childPath, error });
      }
    }
  };
  checkErrors([], result);
  return errors;
}
var logger6, Coder, Writer, Reader;
var init_abstract_coder = __esm({
  "../../node_modules/@ethersproject/abi/lib.esm/coders/abstract-coder.js"() {
    "use strict";
    init_lib2();
    init_lib3();
    init_lib4();
    init_lib();
    init_version5();
    logger6 = new Logger(version5);
    Coder = class {
      constructor(name, type, localName, dynamic) {
        this.name = name;
        this.type = type;
        this.localName = localName;
        this.dynamic = dynamic;
      }
      _throwError(message, value) {
        logger6.throwArgumentError(message, this.localName, value);
      }
    };
    Writer = class {
      constructor(wordSize) {
        defineReadOnly(this, "wordSize", wordSize || 32);
        this._data = [];
        this._dataLength = 0;
        this._padding = new Uint8Array(wordSize);
      }
      get data() {
        return hexConcat(this._data);
      }
      get length() {
        return this._dataLength;
      }
      _writeData(data) {
        this._data.push(data);
        this._dataLength += data.length;
        return data.length;
      }
      appendWriter(writer) {
        return this._writeData(concat(writer._data));
      }
      // Arrayish items; padded on the right to wordSize
      writeBytes(value) {
        let bytes = arrayify(value);
        const paddingOffset = bytes.length % this.wordSize;
        if (paddingOffset) {
          bytes = concat([bytes, this._padding.slice(paddingOffset)]);
        }
        return this._writeData(bytes);
      }
      _getValue(value) {
        let bytes = arrayify(BigNumber.from(value));
        if (bytes.length > this.wordSize) {
          logger6.throwError("value out-of-bounds", Logger.errors.BUFFER_OVERRUN, {
            length: this.wordSize,
            offset: bytes.length
          });
        }
        if (bytes.length % this.wordSize) {
          bytes = concat([this._padding.slice(bytes.length % this.wordSize), bytes]);
        }
        return bytes;
      }
      // BigNumberish items; padded on the left to wordSize
      writeValue(value) {
        return this._writeData(this._getValue(value));
      }
      writeUpdatableValue() {
        const offset = this._data.length;
        this._data.push(this._padding);
        this._dataLength += this.wordSize;
        return (value) => {
          this._data[offset] = this._getValue(value);
        };
      }
    };
    Reader = class _Reader {
      constructor(data, wordSize, coerceFunc, allowLoose) {
        defineReadOnly(this, "_data", arrayify(data));
        defineReadOnly(this, "wordSize", wordSize || 32);
        defineReadOnly(this, "_coerceFunc", coerceFunc);
        defineReadOnly(this, "allowLoose", allowLoose);
        this._offset = 0;
      }
      get data() {
        return hexlify(this._data);
      }
      get consumed() {
        return this._offset;
      }
      // The default Coerce function
      static coerce(name, value) {
        let match = name.match("^u?int([0-9]+)$");
        if (match && parseInt(match[1]) <= 48) {
          value = value.toNumber();
        }
        return value;
      }
      coerce(name, value) {
        if (this._coerceFunc) {
          return this._coerceFunc(name, value);
        }
        return _Reader.coerce(name, value);
      }
      _peekBytes(offset, length, loose) {
        let alignedLength = Math.ceil(length / this.wordSize) * this.wordSize;
        if (this._offset + alignedLength > this._data.length) {
          if (this.allowLoose && loose && this._offset + length <= this._data.length) {
            alignedLength = length;
          } else {
            logger6.throwError("data out-of-bounds", Logger.errors.BUFFER_OVERRUN, {
              length: this._data.length,
              offset: this._offset + alignedLength
            });
          }
        }
        return this._data.slice(this._offset, this._offset + alignedLength);
      }
      subReader(offset) {
        return new _Reader(this._data.slice(this._offset + offset), this.wordSize, this._coerceFunc, this.allowLoose);
      }
      readBytes(length, loose) {
        let bytes = this._peekBytes(0, length, !!loose);
        this._offset += bytes.length;
        return bytes.slice(0, length);
      }
      readValue() {
        return BigNumber.from(this.readBytes(this.wordSize));
      }
    };
  }
});

// ../../node_modules/js-sha3/src/sha3.js
var require_sha3 = __commonJS({
  "../../node_modules/js-sha3/src/sha3.js"(exports, module) {
    "use strict";
    (function() {
      "use strict";
      var INPUT_ERROR = "input is invalid type";
      var FINALIZE_ERROR = "finalize already called";
      var WINDOW = typeof window === "object";
      var root = WINDOW ? window : {};
      if (root.JS_SHA3_NO_WINDOW) {
        WINDOW = false;
      }
      var WEB_WORKER = !WINDOW && typeof self === "object";
      var NODE_JS = !root.JS_SHA3_NO_NODE_JS && typeof process === "object" && process.versions && process.versions.node;
      if (NODE_JS) {
        root = global;
      } else if (WEB_WORKER) {
        root = self;
      }
      var COMMON_JS = !root.JS_SHA3_NO_COMMON_JS && typeof module === "object" && module.exports;
      var AMD = typeof define === "function" && define.amd;
      var ARRAY_BUFFER = !root.JS_SHA3_NO_ARRAY_BUFFER && typeof ArrayBuffer !== "undefined";
      var HEX_CHARS = "0123456789abcdef".split("");
      var SHAKE_PADDING = [31, 7936, 2031616, 520093696];
      var CSHAKE_PADDING = [4, 1024, 262144, 67108864];
      var KECCAK_PADDING = [1, 256, 65536, 16777216];
      var PADDING = [6, 1536, 393216, 100663296];
      var SHIFT = [0, 8, 16, 24];
      var RC = [
        1,
        0,
        32898,
        0,
        32906,
        2147483648,
        2147516416,
        2147483648,
        32907,
        0,
        2147483649,
        0,
        2147516545,
        2147483648,
        32777,
        2147483648,
        138,
        0,
        136,
        0,
        2147516425,
        0,
        2147483658,
        0,
        2147516555,
        0,
        139,
        2147483648,
        32905,
        2147483648,
        32771,
        2147483648,
        32770,
        2147483648,
        128,
        2147483648,
        32778,
        0,
        2147483658,
        2147483648,
        2147516545,
        2147483648,
        32896,
        2147483648,
        2147483649,
        0,
        2147516424,
        2147483648
      ];
      var BITS = [224, 256, 384, 512];
      var SHAKE_BITS = [128, 256];
      var OUTPUT_TYPES = ["hex", "buffer", "arrayBuffer", "array", "digest"];
      var CSHAKE_BYTEPAD = {
        "128": 168,
        "256": 136
      };
      if (root.JS_SHA3_NO_NODE_JS || !Array.isArray) {
        Array.isArray = function(obj) {
          return Object.prototype.toString.call(obj) === "[object Array]";
        };
      }
      if (ARRAY_BUFFER && (root.JS_SHA3_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
        ArrayBuffer.isView = function(obj) {
          return typeof obj === "object" && obj.buffer && obj.buffer.constructor === ArrayBuffer;
        };
      }
      var createOutputMethod = function(bits2, padding2, outputType) {
        return function(message) {
          return new Keccak(bits2, padding2, bits2).update(message)[outputType]();
        };
      };
      var createShakeOutputMethod = function(bits2, padding2, outputType) {
        return function(message, outputBits) {
          return new Keccak(bits2, padding2, outputBits).update(message)[outputType]();
        };
      };
      var createCshakeOutputMethod = function(bits2, padding2, outputType) {
        return function(message, outputBits, n, s) {
          return methods["cshake" + bits2].update(message, outputBits, n, s)[outputType]();
        };
      };
      var createKmacOutputMethod = function(bits2, padding2, outputType) {
        return function(key2, message, outputBits, s) {
          return methods["kmac" + bits2].update(key2, message, outputBits, s)[outputType]();
        };
      };
      var createOutputMethods = function(method, createMethod2, bits2, padding2) {
        for (var i2 = 0; i2 < OUTPUT_TYPES.length; ++i2) {
          var type = OUTPUT_TYPES[i2];
          method[type] = createMethod2(bits2, padding2, type);
        }
        return method;
      };
      var createMethod = function(bits2, padding2) {
        var method = createOutputMethod(bits2, padding2, "hex");
        method.create = function() {
          return new Keccak(bits2, padding2, bits2);
        };
        method.update = function(message) {
          return method.create().update(message);
        };
        return createOutputMethods(method, createOutputMethod, bits2, padding2);
      };
      var createShakeMethod = function(bits2, padding2) {
        var method = createShakeOutputMethod(bits2, padding2, "hex");
        method.create = function(outputBits) {
          return new Keccak(bits2, padding2, outputBits);
        };
        method.update = function(message, outputBits) {
          return method.create(outputBits).update(message);
        };
        return createOutputMethods(method, createShakeOutputMethod, bits2, padding2);
      };
      var createCshakeMethod = function(bits2, padding2) {
        var w = CSHAKE_BYTEPAD[bits2];
        var method = createCshakeOutputMethod(bits2, padding2, "hex");
        method.create = function(outputBits, n, s) {
          if (!n && !s) {
            return methods["shake" + bits2].create(outputBits);
          } else {
            return new Keccak(bits2, padding2, outputBits).bytepad([n, s], w);
          }
        };
        method.update = function(message, outputBits, n, s) {
          return method.create(outputBits, n, s).update(message);
        };
        return createOutputMethods(method, createCshakeOutputMethod, bits2, padding2);
      };
      var createKmacMethod = function(bits2, padding2) {
        var w = CSHAKE_BYTEPAD[bits2];
        var method = createKmacOutputMethod(bits2, padding2, "hex");
        method.create = function(key2, outputBits, s) {
          return new Kmac(bits2, padding2, outputBits).bytepad(["KMAC", s], w).bytepad([key2], w);
        };
        method.update = function(key2, message, outputBits, s) {
          return method.create(key2, outputBits, s).update(message);
        };
        return createOutputMethods(method, createKmacOutputMethod, bits2, padding2);
      };
      var algorithms = [
        { name: "keccak", padding: KECCAK_PADDING, bits: BITS, createMethod },
        { name: "sha3", padding: PADDING, bits: BITS, createMethod },
        { name: "shake", padding: SHAKE_PADDING, bits: SHAKE_BITS, createMethod: createShakeMethod },
        { name: "cshake", padding: CSHAKE_PADDING, bits: SHAKE_BITS, createMethod: createCshakeMethod },
        { name: "kmac", padding: CSHAKE_PADDING, bits: SHAKE_BITS, createMethod: createKmacMethod }
      ];
      var methods = {}, methodNames = [];
      for (var i = 0; i < algorithms.length; ++i) {
        var algorithm = algorithms[i];
        var bits = algorithm.bits;
        for (var j = 0; j < bits.length; ++j) {
          var methodName = algorithm.name + "_" + bits[j];
          methodNames.push(methodName);
          methods[methodName] = algorithm.createMethod(bits[j], algorithm.padding);
          if (algorithm.name !== "sha3") {
            var newMethodName = algorithm.name + bits[j];
            methodNames.push(newMethodName);
            methods[newMethodName] = methods[methodName];
          }
        }
      }
      function Keccak(bits2, padding2, outputBits) {
        this.blocks = [];
        this.s = [];
        this.padding = padding2;
        this.outputBits = outputBits;
        this.reset = true;
        this.finalized = false;
        this.block = 0;
        this.start = 0;
        this.blockCount = 1600 - (bits2 << 1) >> 5;
        this.byteCount = this.blockCount << 2;
        this.outputBlocks = outputBits >> 5;
        this.extraBytes = (outputBits & 31) >> 3;
        for (var i2 = 0; i2 < 50; ++i2) {
          this.s[i2] = 0;
        }
      }
      Keccak.prototype.update = function(message) {
        if (this.finalized) {
          throw new Error(FINALIZE_ERROR);
        }
        var notString, type = typeof message;
        if (type !== "string") {
          if (type === "object") {
            if (message === null) {
              throw new Error(INPUT_ERROR);
            } else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
              message = new Uint8Array(message);
            } else if (!Array.isArray(message)) {
              if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
                throw new Error(INPUT_ERROR);
              }
            }
          } else {
            throw new Error(INPUT_ERROR);
          }
          notString = true;
        }
        var blocks = this.blocks, byteCount = this.byteCount, length = message.length, blockCount = this.blockCount, index = 0, s = this.s, i2, code;
        while (index < length) {
          if (this.reset) {
            this.reset = false;
            blocks[0] = this.block;
            for (i2 = 1; i2 < blockCount + 1; ++i2) {
              blocks[i2] = 0;
            }
          }
          if (notString) {
            for (i2 = this.start; index < length && i2 < byteCount; ++index) {
              blocks[i2 >> 2] |= message[index] << SHIFT[i2++ & 3];
            }
          } else {
            for (i2 = this.start; index < length && i2 < byteCount; ++index) {
              code = message.charCodeAt(index);
              if (code < 128) {
                blocks[i2 >> 2] |= code << SHIFT[i2++ & 3];
              } else if (code < 2048) {
                blocks[i2 >> 2] |= (192 | code >> 6) << SHIFT[i2++ & 3];
                blocks[i2 >> 2] |= (128 | code & 63) << SHIFT[i2++ & 3];
              } else if (code < 55296 || code >= 57344) {
                blocks[i2 >> 2] |= (224 | code >> 12) << SHIFT[i2++ & 3];
                blocks[i2 >> 2] |= (128 | code >> 6 & 63) << SHIFT[i2++ & 3];
                blocks[i2 >> 2] |= (128 | code & 63) << SHIFT[i2++ & 3];
              } else {
                code = 65536 + ((code & 1023) << 10 | message.charCodeAt(++index) & 1023);
                blocks[i2 >> 2] |= (240 | code >> 18) << SHIFT[i2++ & 3];
                blocks[i2 >> 2] |= (128 | code >> 12 & 63) << SHIFT[i2++ & 3];
                blocks[i2 >> 2] |= (128 | code >> 6 & 63) << SHIFT[i2++ & 3];
                blocks[i2 >> 2] |= (128 | code & 63) << SHIFT[i2++ & 3];
              }
            }
          }
          this.lastByteIndex = i2;
          if (i2 >= byteCount) {
            this.start = i2 - byteCount;
            this.block = blocks[blockCount];
            for (i2 = 0; i2 < blockCount; ++i2) {
              s[i2] ^= blocks[i2];
            }
            f(s);
            this.reset = true;
          } else {
            this.start = i2;
          }
        }
        return this;
      };
      Keccak.prototype.encode = function(x, right) {
        var o = x & 255, n = 1;
        var bytes = [o];
        x = x >> 8;
        o = x & 255;
        while (o > 0) {
          bytes.unshift(o);
          x = x >> 8;
          o = x & 255;
          ++n;
        }
        if (right) {
          bytes.push(n);
        } else {
          bytes.unshift(n);
        }
        this.update(bytes);
        return bytes.length;
      };
      Keccak.prototype.encodeString = function(str) {
        var notString, type = typeof str;
        if (type !== "string") {
          if (type === "object") {
            if (str === null) {
              throw new Error(INPUT_ERROR);
            } else if (ARRAY_BUFFER && str.constructor === ArrayBuffer) {
              str = new Uint8Array(str);
            } else if (!Array.isArray(str)) {
              if (!ARRAY_BUFFER || !ArrayBuffer.isView(str)) {
                throw new Error(INPUT_ERROR);
              }
            }
          } else {
            throw new Error(INPUT_ERROR);
          }
          notString = true;
        }
        var bytes = 0, length = str.length;
        if (notString) {
          bytes = length;
        } else {
          for (var i2 = 0; i2 < str.length; ++i2) {
            var code = str.charCodeAt(i2);
            if (code < 128) {
              bytes += 1;
            } else if (code < 2048) {
              bytes += 2;
            } else if (code < 55296 || code >= 57344) {
              bytes += 3;
            } else {
              code = 65536 + ((code & 1023) << 10 | str.charCodeAt(++i2) & 1023);
              bytes += 4;
            }
          }
        }
        bytes += this.encode(bytes * 8);
        this.update(str);
        return bytes;
      };
      Keccak.prototype.bytepad = function(strs, w) {
        var bytes = this.encode(w);
        for (var i2 = 0; i2 < strs.length; ++i2) {
          bytes += this.encodeString(strs[i2]);
        }
        var paddingBytes = w - bytes % w;
        var zeros2 = [];
        zeros2.length = paddingBytes;
        this.update(zeros2);
        return this;
      };
      Keccak.prototype.finalize = function() {
        if (this.finalized) {
          return;
        }
        this.finalized = true;
        var blocks = this.blocks, i2 = this.lastByteIndex, blockCount = this.blockCount, s = this.s;
        blocks[i2 >> 2] |= this.padding[i2 & 3];
        if (this.lastByteIndex === this.byteCount) {
          blocks[0] = blocks[blockCount];
          for (i2 = 1; i2 < blockCount + 1; ++i2) {
            blocks[i2] = 0;
          }
        }
        blocks[blockCount - 1] |= 2147483648;
        for (i2 = 0; i2 < blockCount; ++i2) {
          s[i2] ^= blocks[i2];
        }
        f(s);
      };
      Keccak.prototype.toString = Keccak.prototype.hex = function() {
        this.finalize();
        var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks, extraBytes = this.extraBytes, i2 = 0, j2 = 0;
        var hex = "", block;
        while (j2 < outputBlocks) {
          for (i2 = 0; i2 < blockCount && j2 < outputBlocks; ++i2, ++j2) {
            block = s[i2];
            hex += HEX_CHARS[block >> 4 & 15] + HEX_CHARS[block & 15] + HEX_CHARS[block >> 12 & 15] + HEX_CHARS[block >> 8 & 15] + HEX_CHARS[block >> 20 & 15] + HEX_CHARS[block >> 16 & 15] + HEX_CHARS[block >> 28 & 15] + HEX_CHARS[block >> 24 & 15];
          }
          if (j2 % blockCount === 0) {
            f(s);
            i2 = 0;
          }
        }
        if (extraBytes) {
          block = s[i2];
          hex += HEX_CHARS[block >> 4 & 15] + HEX_CHARS[block & 15];
          if (extraBytes > 1) {
            hex += HEX_CHARS[block >> 12 & 15] + HEX_CHARS[block >> 8 & 15];
          }
          if (extraBytes > 2) {
            hex += HEX_CHARS[block >> 20 & 15] + HEX_CHARS[block >> 16 & 15];
          }
        }
        return hex;
      };
      Keccak.prototype.arrayBuffer = function() {
        this.finalize();
        var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks, extraBytes = this.extraBytes, i2 = 0, j2 = 0;
        var bytes = this.outputBits >> 3;
        var buffer;
        if (extraBytes) {
          buffer = new ArrayBuffer(outputBlocks + 1 << 2);
        } else {
          buffer = new ArrayBuffer(bytes);
        }
        var array = new Uint32Array(buffer);
        while (j2 < outputBlocks) {
          for (i2 = 0; i2 < blockCount && j2 < outputBlocks; ++i2, ++j2) {
            array[j2] = s[i2];
          }
          if (j2 % blockCount === 0) {
            f(s);
          }
        }
        if (extraBytes) {
          array[i2] = s[i2];
          buffer = buffer.slice(0, bytes);
        }
        return buffer;
      };
      Keccak.prototype.buffer = Keccak.prototype.arrayBuffer;
      Keccak.prototype.digest = Keccak.prototype.array = function() {
        this.finalize();
        var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks, extraBytes = this.extraBytes, i2 = 0, j2 = 0;
        var array = [], offset, block;
        while (j2 < outputBlocks) {
          for (i2 = 0; i2 < blockCount && j2 < outputBlocks; ++i2, ++j2) {
            offset = j2 << 2;
            block = s[i2];
            array[offset] = block & 255;
            array[offset + 1] = block >> 8 & 255;
            array[offset + 2] = block >> 16 & 255;
            array[offset + 3] = block >> 24 & 255;
          }
          if (j2 % blockCount === 0) {
            f(s);
          }
        }
        if (extraBytes) {
          offset = j2 << 2;
          block = s[i2];
          array[offset] = block & 255;
          if (extraBytes > 1) {
            array[offset + 1] = block >> 8 & 255;
          }
          if (extraBytes > 2) {
            array[offset + 2] = block >> 16 & 255;
          }
        }
        return array;
      };
      function Kmac(bits2, padding2, outputBits) {
        Keccak.call(this, bits2, padding2, outputBits);
      }
      Kmac.prototype = new Keccak();
      Kmac.prototype.finalize = function() {
        this.encode(this.outputBits, true);
        return Keccak.prototype.finalize.call(this);
      };
      var f = function(s) {
        var h, l, n, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9, b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15, b16, b17, b18, b19, b20, b21, b22, b23, b24, b25, b26, b27, b28, b29, b30, b31, b32, b33, b34, b35, b36, b37, b38, b39, b40, b41, b42, b43, b44, b45, b46, b47, b48, b49;
        for (n = 0; n < 48; n += 2) {
          c0 = s[0] ^ s[10] ^ s[20] ^ s[30] ^ s[40];
          c1 = s[1] ^ s[11] ^ s[21] ^ s[31] ^ s[41];
          c2 = s[2] ^ s[12] ^ s[22] ^ s[32] ^ s[42];
          c3 = s[3] ^ s[13] ^ s[23] ^ s[33] ^ s[43];
          c4 = s[4] ^ s[14] ^ s[24] ^ s[34] ^ s[44];
          c5 = s[5] ^ s[15] ^ s[25] ^ s[35] ^ s[45];
          c6 = s[6] ^ s[16] ^ s[26] ^ s[36] ^ s[46];
          c7 = s[7] ^ s[17] ^ s[27] ^ s[37] ^ s[47];
          c8 = s[8] ^ s[18] ^ s[28] ^ s[38] ^ s[48];
          c9 = s[9] ^ s[19] ^ s[29] ^ s[39] ^ s[49];
          h = c8 ^ (c2 << 1 | c3 >>> 31);
          l = c9 ^ (c3 << 1 | c2 >>> 31);
          s[0] ^= h;
          s[1] ^= l;
          s[10] ^= h;
          s[11] ^= l;
          s[20] ^= h;
          s[21] ^= l;
          s[30] ^= h;
          s[31] ^= l;
          s[40] ^= h;
          s[41] ^= l;
          h = c0 ^ (c4 << 1 | c5 >>> 31);
          l = c1 ^ (c5 << 1 | c4 >>> 31);
          s[2] ^= h;
          s[3] ^= l;
          s[12] ^= h;
          s[13] ^= l;
          s[22] ^= h;
          s[23] ^= l;
          s[32] ^= h;
          s[33] ^= l;
          s[42] ^= h;
          s[43] ^= l;
          h = c2 ^ (c6 << 1 | c7 >>> 31);
          l = c3 ^ (c7 << 1 | c6 >>> 31);
          s[4] ^= h;
          s[5] ^= l;
          s[14] ^= h;
          s[15] ^= l;
          s[24] ^= h;
          s[25] ^= l;
          s[34] ^= h;
          s[35] ^= l;
          s[44] ^= h;
          s[45] ^= l;
          h = c4 ^ (c8 << 1 | c9 >>> 31);
          l = c5 ^ (c9 << 1 | c8 >>> 31);
          s[6] ^= h;
          s[7] ^= l;
          s[16] ^= h;
          s[17] ^= l;
          s[26] ^= h;
          s[27] ^= l;
          s[36] ^= h;
          s[37] ^= l;
          s[46] ^= h;
          s[47] ^= l;
          h = c6 ^ (c0 << 1 | c1 >>> 31);
          l = c7 ^ (c1 << 1 | c0 >>> 31);
          s[8] ^= h;
          s[9] ^= l;
          s[18] ^= h;
          s[19] ^= l;
          s[28] ^= h;
          s[29] ^= l;
          s[38] ^= h;
          s[39] ^= l;
          s[48] ^= h;
          s[49] ^= l;
          b0 = s[0];
          b1 = s[1];
          b32 = s[11] << 4 | s[10] >>> 28;
          b33 = s[10] << 4 | s[11] >>> 28;
          b14 = s[20] << 3 | s[21] >>> 29;
          b15 = s[21] << 3 | s[20] >>> 29;
          b46 = s[31] << 9 | s[30] >>> 23;
          b47 = s[30] << 9 | s[31] >>> 23;
          b28 = s[40] << 18 | s[41] >>> 14;
          b29 = s[41] << 18 | s[40] >>> 14;
          b20 = s[2] << 1 | s[3] >>> 31;
          b21 = s[3] << 1 | s[2] >>> 31;
          b2 = s[13] << 12 | s[12] >>> 20;
          b3 = s[12] << 12 | s[13] >>> 20;
          b34 = s[22] << 10 | s[23] >>> 22;
          b35 = s[23] << 10 | s[22] >>> 22;
          b16 = s[33] << 13 | s[32] >>> 19;
          b17 = s[32] << 13 | s[33] >>> 19;
          b48 = s[42] << 2 | s[43] >>> 30;
          b49 = s[43] << 2 | s[42] >>> 30;
          b40 = s[5] << 30 | s[4] >>> 2;
          b41 = s[4] << 30 | s[5] >>> 2;
          b22 = s[14] << 6 | s[15] >>> 26;
          b23 = s[15] << 6 | s[14] >>> 26;
          b4 = s[25] << 11 | s[24] >>> 21;
          b5 = s[24] << 11 | s[25] >>> 21;
          b36 = s[34] << 15 | s[35] >>> 17;
          b37 = s[35] << 15 | s[34] >>> 17;
          b18 = s[45] << 29 | s[44] >>> 3;
          b19 = s[44] << 29 | s[45] >>> 3;
          b10 = s[6] << 28 | s[7] >>> 4;
          b11 = s[7] << 28 | s[6] >>> 4;
          b42 = s[17] << 23 | s[16] >>> 9;
          b43 = s[16] << 23 | s[17] >>> 9;
          b24 = s[26] << 25 | s[27] >>> 7;
          b25 = s[27] << 25 | s[26] >>> 7;
          b6 = s[36] << 21 | s[37] >>> 11;
          b7 = s[37] << 21 | s[36] >>> 11;
          b38 = s[47] << 24 | s[46] >>> 8;
          b39 = s[46] << 24 | s[47] >>> 8;
          b30 = s[8] << 27 | s[9] >>> 5;
          b31 = s[9] << 27 | s[8] >>> 5;
          b12 = s[18] << 20 | s[19] >>> 12;
          b13 = s[19] << 20 | s[18] >>> 12;
          b44 = s[29] << 7 | s[28] >>> 25;
          b45 = s[28] << 7 | s[29] >>> 25;
          b26 = s[38] << 8 | s[39] >>> 24;
          b27 = s[39] << 8 | s[38] >>> 24;
          b8 = s[48] << 14 | s[49] >>> 18;
          b9 = s[49] << 14 | s[48] >>> 18;
          s[0] = b0 ^ ~b2 & b4;
          s[1] = b1 ^ ~b3 & b5;
          s[10] = b10 ^ ~b12 & b14;
          s[11] = b11 ^ ~b13 & b15;
          s[20] = b20 ^ ~b22 & b24;
          s[21] = b21 ^ ~b23 & b25;
          s[30] = b30 ^ ~b32 & b34;
          s[31] = b31 ^ ~b33 & b35;
          s[40] = b40 ^ ~b42 & b44;
          s[41] = b41 ^ ~b43 & b45;
          s[2] = b2 ^ ~b4 & b6;
          s[3] = b3 ^ ~b5 & b7;
          s[12] = b12 ^ ~b14 & b16;
          s[13] = b13 ^ ~b15 & b17;
          s[22] = b22 ^ ~b24 & b26;
          s[23] = b23 ^ ~b25 & b27;
          s[32] = b32 ^ ~b34 & b36;
          s[33] = b33 ^ ~b35 & b37;
          s[42] = b42 ^ ~b44 & b46;
          s[43] = b43 ^ ~b45 & b47;
          s[4] = b4 ^ ~b6 & b8;
          s[5] = b5 ^ ~b7 & b9;
          s[14] = b14 ^ ~b16 & b18;
          s[15] = b15 ^ ~b17 & b19;
          s[24] = b24 ^ ~b26 & b28;
          s[25] = b25 ^ ~b27 & b29;
          s[34] = b34 ^ ~b36 & b38;
          s[35] = b35 ^ ~b37 & b39;
          s[44] = b44 ^ ~b46 & b48;
          s[45] = b45 ^ ~b47 & b49;
          s[6] = b6 ^ ~b8 & b0;
          s[7] = b7 ^ ~b9 & b1;
          s[16] = b16 ^ ~b18 & b10;
          s[17] = b17 ^ ~b19 & b11;
          s[26] = b26 ^ ~b28 & b20;
          s[27] = b27 ^ ~b29 & b21;
          s[36] = b36 ^ ~b38 & b30;
          s[37] = b37 ^ ~b39 & b31;
          s[46] = b46 ^ ~b48 & b40;
          s[47] = b47 ^ ~b49 & b41;
          s[8] = b8 ^ ~b0 & b2;
          s[9] = b9 ^ ~b1 & b3;
          s[18] = b18 ^ ~b10 & b12;
          s[19] = b19 ^ ~b11 & b13;
          s[28] = b28 ^ ~b20 & b22;
          s[29] = b29 ^ ~b21 & b23;
          s[38] = b38 ^ ~b30 & b32;
          s[39] = b39 ^ ~b31 & b33;
          s[48] = b48 ^ ~b40 & b42;
          s[49] = b49 ^ ~b41 & b43;
          s[0] ^= RC[n];
          s[1] ^= RC[n + 1];
        }
      };
      if (COMMON_JS) {
        module.exports = methods;
      } else {
        for (i = 0; i < methodNames.length; ++i) {
          root[methodNames[i]] = methods[methodNames[i]];
        }
        if (AMD) {
          define(function() {
            return methods;
          });
        }
      }
    })();
  }
});

// ../../node_modules/@ethersproject/keccak256/lib.esm/index.js
var lib_exports4 = {};
__export(lib_exports4, {
  keccak256: () => keccak256
});
function keccak256(data) {
  return "0x" + import_js_sha3.default.keccak_256(arrayify(data));
}
var import_js_sha3;
var init_lib5 = __esm({
  "../../node_modules/@ethersproject/keccak256/lib.esm/index.js"() {
    "use strict";
    import_js_sha3 = __toESM(require_sha3());
    init_lib2();
  }
});

// ../../node_modules/@ethersproject/rlp/lib.esm/_version.js
var version6;
var init_version6 = __esm({
  "../../node_modules/@ethersproject/rlp/lib.esm/_version.js"() {
    "use strict";
    version6 = "rlp/5.8.0";
  }
});

// ../../node_modules/@ethersproject/rlp/lib.esm/index.js
var lib_exports5 = {};
__export(lib_exports5, {
  decode: () => decode,
  encode: () => encode
});
function arrayifyInteger(value) {
  const result = [];
  while (value) {
    result.unshift(value & 255);
    value >>= 8;
  }
  return result;
}
function unarrayifyInteger(data, offset, length) {
  let result = 0;
  for (let i = 0; i < length; i++) {
    result = result * 256 + data[offset + i];
  }
  return result;
}
function _encode(object) {
  if (Array.isArray(object)) {
    let payload = [];
    object.forEach(function(child) {
      payload = payload.concat(_encode(child));
    });
    if (payload.length <= 55) {
      payload.unshift(192 + payload.length);
      return payload;
    }
    const length2 = arrayifyInteger(payload.length);
    length2.unshift(247 + length2.length);
    return length2.concat(payload);
  }
  if (!isBytesLike(object)) {
    logger7.throwArgumentError("RLP object must be BytesLike", "object", object);
  }
  const data = Array.prototype.slice.call(arrayify(object));
  if (data.length === 1 && data[0] <= 127) {
    return data;
  } else if (data.length <= 55) {
    data.unshift(128 + data.length);
    return data;
  }
  const length = arrayifyInteger(data.length);
  length.unshift(183 + length.length);
  return length.concat(data);
}
function encode(object) {
  return hexlify(_encode(object));
}
function _decodeChildren(data, offset, childOffset, length) {
  const result = [];
  while (childOffset < offset + 1 + length) {
    const decoded = _decode(data, childOffset);
    result.push(decoded.result);
    childOffset += decoded.consumed;
    if (childOffset > offset + 1 + length) {
      logger7.throwError("child data too short", Logger.errors.BUFFER_OVERRUN, {});
    }
  }
  return { consumed: 1 + length, result };
}
function _decode(data, offset) {
  if (data.length === 0) {
    logger7.throwError("data too short", Logger.errors.BUFFER_OVERRUN, {});
  }
  if (data[offset] >= 248) {
    const lengthLength = data[offset] - 247;
    if (offset + 1 + lengthLength > data.length) {
      logger7.throwError("data short segment too short", Logger.errors.BUFFER_OVERRUN, {});
    }
    const length = unarrayifyInteger(data, offset + 1, lengthLength);
    if (offset + 1 + lengthLength + length > data.length) {
      logger7.throwError("data long segment too short", Logger.errors.BUFFER_OVERRUN, {});
    }
    return _decodeChildren(data, offset, offset + 1 + lengthLength, lengthLength + length);
  } else if (data[offset] >= 192) {
    const length = data[offset] - 192;
    if (offset + 1 + length > data.length) {
      logger7.throwError("data array too short", Logger.errors.BUFFER_OVERRUN, {});
    }
    return _decodeChildren(data, offset, offset + 1, length);
  } else if (data[offset] >= 184) {
    const lengthLength = data[offset] - 183;
    if (offset + 1 + lengthLength > data.length) {
      logger7.throwError("data array too short", Logger.errors.BUFFER_OVERRUN, {});
    }
    const length = unarrayifyInteger(data, offset + 1, lengthLength);
    if (offset + 1 + lengthLength + length > data.length) {
      logger7.throwError("data array too short", Logger.errors.BUFFER_OVERRUN, {});
    }
    const result = hexlify(data.slice(offset + 1 + lengthLength, offset + 1 + lengthLength + length));
    return { consumed: 1 + lengthLength + length, result };
  } else if (data[offset] >= 128) {
    const length = data[offset] - 128;
    if (offset + 1 + length > data.length) {
      logger7.throwError("data too short", Logger.errors.BUFFER_OVERRUN, {});
    }
    const result = hexlify(data.slice(offset + 1, offset + 1 + length));
    return { consumed: 1 + length, result };
  }
  return { consumed: 1, result: hexlify(data[offset]) };
}
function decode(data) {
  const bytes = arrayify(data);
  const decoded = _decode(bytes, 0);
  if (decoded.consumed !== bytes.length) {
    logger7.throwArgumentError("invalid rlp data", "data", data);
  }
  return decoded.result;
}
var logger7;
var init_lib6 = __esm({
  "../../node_modules/@ethersproject/rlp/lib.esm/index.js"() {
    "use strict";
    init_lib2();
    init_lib();
    init_version6();
    logger7 = new Logger(version6);
  }
});

// ../../node_modules/@ethersproject/address/lib.esm/_version.js
var version7;
var init_version7 = __esm({
  "../../node_modules/@ethersproject/address/lib.esm/_version.js"() {
    "use strict";
    version7 = "address/5.8.0";
  }
});

// ../../node_modules/@ethersproject/address/lib.esm/index.js
var lib_exports6 = {};
__export(lib_exports6, {
  getAddress: () => getAddress,
  getContractAddress: () => getContractAddress,
  getCreate2Address: () => getCreate2Address,
  getIcapAddress: () => getIcapAddress,
  isAddress: () => isAddress
});
function getChecksumAddress(address) {
  if (!isHexString(address, 20)) {
    logger8.throwArgumentError("invalid address", "address", address);
  }
  address = address.toLowerCase();
  const chars = address.substring(2).split("");
  const expanded = new Uint8Array(40);
  for (let i = 0; i < 40; i++) {
    expanded[i] = chars[i].charCodeAt(0);
  }
  const hashed = arrayify(keccak256(expanded));
  for (let i = 0; i < 40; i += 2) {
    if (hashed[i >> 1] >> 4 >= 8) {
      chars[i] = chars[i].toUpperCase();
    }
    if ((hashed[i >> 1] & 15) >= 8) {
      chars[i + 1] = chars[i + 1].toUpperCase();
    }
  }
  return "0x" + chars.join("");
}
function log10(x) {
  if (Math.log10) {
    return Math.log10(x);
  }
  return Math.log(x) / Math.LN10;
}
function ibanChecksum(address) {
  address = address.toUpperCase();
  address = address.substring(4) + address.substring(0, 2) + "00";
  let expanded = address.split("").map((c) => {
    return ibanLookup[c];
  }).join("");
  while (expanded.length >= safeDigits) {
    let block = expanded.substring(0, safeDigits);
    expanded = parseInt(block, 10) % 97 + expanded.substring(block.length);
  }
  let checksum = String(98 - parseInt(expanded, 10) % 97);
  while (checksum.length < 2) {
    checksum = "0" + checksum;
  }
  return checksum;
}
function getAddress(address) {
  let result = null;
  if (typeof address !== "string") {
    logger8.throwArgumentError("invalid address", "address", address);
  }
  if (address.match(/^(0x)?[0-9a-fA-F]{40}$/)) {
    if (address.substring(0, 2) !== "0x") {
      address = "0x" + address;
    }
    result = getChecksumAddress(address);
    if (address.match(/([A-F].*[a-f])|([a-f].*[A-F])/) && result !== address) {
      logger8.throwArgumentError("bad address checksum", "address", address);
    }
  } else if (address.match(/^XE[0-9]{2}[0-9A-Za-z]{30,31}$/)) {
    if (address.substring(2, 4) !== ibanChecksum(address)) {
      logger8.throwArgumentError("bad icap checksum", "address", address);
    }
    result = _base36To16(address.substring(4));
    while (result.length < 40) {
      result = "0" + result;
    }
    result = getChecksumAddress("0x" + result);
  } else {
    logger8.throwArgumentError("invalid address", "address", address);
  }
  return result;
}
function isAddress(address) {
  try {
    getAddress(address);
    return true;
  } catch (error) {
  }
  return false;
}
function getIcapAddress(address) {
  let base36 = _base16To36(getAddress(address).substring(2)).toUpperCase();
  while (base36.length < 30) {
    base36 = "0" + base36;
  }
  return "XE" + ibanChecksum("XE00" + base36) + base36;
}
function getContractAddress(transaction) {
  let from = null;
  try {
    from = getAddress(transaction.from);
  } catch (error) {
    logger8.throwArgumentError("missing from address", "transaction", transaction);
  }
  const nonce = stripZeros(arrayify(BigNumber.from(transaction.nonce).toHexString()));
  return getAddress(hexDataSlice(keccak256(encode([from, nonce])), 12));
}
function getCreate2Address(from, salt, initCodeHash) {
  if (hexDataLength(salt) !== 32) {
    logger8.throwArgumentError("salt must be 32 bytes", "salt", salt);
  }
  if (hexDataLength(initCodeHash) !== 32) {
    logger8.throwArgumentError("initCodeHash must be 32 bytes", "initCodeHash", initCodeHash);
  }
  return getAddress(hexDataSlice(keccak256(concat(["0xff", getAddress(from), salt, initCodeHash])), 12));
}
var logger8, MAX_SAFE_INTEGER, ibanLookup, safeDigits;
var init_lib7 = __esm({
  "../../node_modules/@ethersproject/address/lib.esm/index.js"() {
    "use strict";
    init_lib2();
    init_lib3();
    init_lib5();
    init_lib6();
    init_lib();
    init_version7();
    logger8 = new Logger(version7);
    MAX_SAFE_INTEGER = 9007199254740991;
    ibanLookup = {};
    for (let i = 0; i < 10; i++) {
      ibanLookup[String(i)] = String(i);
    }
    for (let i = 0; i < 26; i++) {
      ibanLookup[String.fromCharCode(65 + i)] = String(10 + i);
    }
    safeDigits = Math.floor(log10(MAX_SAFE_INTEGER));
  }
});

// ../../node_modules/@ethersproject/abi/lib.esm/coders/address.js
var AddressCoder;
var init_address = __esm({
  "../../node_modules/@ethersproject/abi/lib.esm/coders/address.js"() {
    "use strict";
    init_lib7();
    init_lib2();
    init_abstract_coder();
    AddressCoder = class extends Coder {
      constructor(localName) {
        super("address", "address", localName, false);
      }
      defaultValue() {
        return "0x0000000000000000000000000000000000000000";
      }
      encode(writer, value) {
        try {
          value = getAddress(value);
        } catch (error) {
          this._throwError(error.message, value);
        }
        return writer.writeValue(value);
      }
      decode(reader) {
        return getAddress(hexZeroPad(reader.readValue().toHexString(), 20));
      }
    };
  }
});

// ../../node_modules/@ethersproject/abi/lib.esm/coders/anonymous.js
var AnonymousCoder;
var init_anonymous = __esm({
  "../../node_modules/@ethersproject/abi/lib.esm/coders/anonymous.js"() {
    "use strict";
    init_abstract_coder();
    AnonymousCoder = class extends Coder {
      constructor(coder) {
        super(coder.name, coder.type, void 0, coder.dynamic);
        this.coder = coder;
      }
      defaultValue() {
        return this.coder.defaultValue();
      }
      encode(writer, value) {
        return this.coder.encode(writer, value);
      }
      decode(reader) {
        return this.coder.decode(reader);
      }
    };
  }
});

// ../../node_modules/@ethersproject/abi/lib.esm/coders/array.js
function pack(writer, coders, values) {
  let arrayValues = null;
  if (Array.isArray(values)) {
    arrayValues = values;
  } else if (values && typeof values === "object") {
    let unique = {};
    arrayValues = coders.map((coder) => {
      const name = coder.localName;
      if (!name) {
        logger9.throwError("cannot encode object for signature with missing names", Logger.errors.INVALID_ARGUMENT, {
          argument: "values",
          coder,
          value: values
        });
      }
      if (unique[name]) {
        logger9.throwError("cannot encode object for signature with duplicate names", Logger.errors.INVALID_ARGUMENT, {
          argument: "values",
          coder,
          value: values
        });
      }
      unique[name] = true;
      return values[name];
    });
  } else {
    logger9.throwArgumentError("invalid tuple value", "tuple", values);
  }
  if (coders.length !== arrayValues.length) {
    logger9.throwArgumentError("types/value length mismatch", "tuple", values);
  }
  let staticWriter = new Writer(writer.wordSize);
  let dynamicWriter = new Writer(writer.wordSize);
  let updateFuncs = [];
  coders.forEach((coder, index) => {
    let value = arrayValues[index];
    if (coder.dynamic) {
      let dynamicOffset = dynamicWriter.length;
      coder.encode(dynamicWriter, value);
      let updateFunc = staticWriter.writeUpdatableValue();
      updateFuncs.push((baseOffset) => {
        updateFunc(baseOffset + dynamicOffset);
      });
    } else {
      coder.encode(staticWriter, value);
    }
  });
  updateFuncs.forEach((func) => {
    func(staticWriter.length);
  });
  let length = writer.appendWriter(staticWriter);
  length += writer.appendWriter(dynamicWriter);
  return length;
}
function unpack(reader, coders) {
  let values = [];
  let baseReader = reader.subReader(0);
  coders.forEach((coder) => {
    let value = null;
    if (coder.dynamic) {
      let offset = reader.readValue();
      let offsetReader = baseReader.subReader(offset.toNumber());
      try {
        value = coder.decode(offsetReader);
      } catch (error) {
        if (error.code === Logger.errors.BUFFER_OVERRUN) {
          throw error;
        }
        value = error;
        value.baseType = coder.name;
        value.name = coder.localName;
        value.type = coder.type;
      }
    } else {
      try {
        value = coder.decode(reader);
      } catch (error) {
        if (error.code === Logger.errors.BUFFER_OVERRUN) {
          throw error;
        }
        value = error;
        value.baseType = coder.name;
        value.name = coder.localName;
        value.type = coder.type;
      }
    }
    if (value != void 0) {
      values.push(value);
    }
  });
  const uniqueNames = coders.reduce((accum, coder) => {
    const name = coder.localName;
    if (name) {
      if (!accum[name]) {
        accum[name] = 0;
      }
      accum[name]++;
    }
    return accum;
  }, {});
  coders.forEach((coder, index) => {
    let name = coder.localName;
    if (!name || uniqueNames[name] !== 1) {
      return;
    }
    if (name === "length") {
      name = "_length";
    }
    if (values[name] != null) {
      return;
    }
    const value = values[index];
    if (value instanceof Error) {
      Object.defineProperty(values, name, {
        enumerable: true,
        get: () => {
          throw value;
        }
      });
    } else {
      values[name] = value;
    }
  });
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (value instanceof Error) {
      Object.defineProperty(values, i, {
        enumerable: true,
        get: () => {
          throw value;
        }
      });
    }
  }
  return Object.freeze(values);
}
var logger9, ArrayCoder;
var init_array = __esm({
  "../../node_modules/@ethersproject/abi/lib.esm/coders/array.js"() {
    "use strict";
    init_lib();
    init_version5();
    init_abstract_coder();
    init_anonymous();
    logger9 = new Logger(version5);
    ArrayCoder = class extends Coder {
      constructor(coder, length, localName) {
        const type = coder.type + "[" + (length >= 0 ? length : "") + "]";
        const dynamic = length === -1 || coder.dynamic;
        super("array", type, localName, dynamic);
        this.coder = coder;
        this.length = length;
      }
      defaultValue() {
        const defaultChild = this.coder.defaultValue();
        const result = [];
        for (let i = 0; i < this.length; i++) {
          result.push(defaultChild);
        }
        return result;
      }
      encode(writer, value) {
        if (!Array.isArray(value)) {
          this._throwError("expected array value", value);
        }
        let count = this.length;
        if (count === -1) {
          count = value.length;
          writer.writeValue(value.length);
        }
        logger9.checkArgumentCount(value.length, count, "coder array" + (this.localName ? " " + this.localName : ""));
        let coders = [];
        for (let i = 0; i < value.length; i++) {
          coders.push(this.coder);
        }
        return pack(writer, coders, value);
      }
      decode(reader) {
        let count = this.length;
        if (count === -1) {
          count = reader.readValue().toNumber();
          if (count * 32 > reader._data.length) {
            logger9.throwError("insufficient data length", Logger.errors.BUFFER_OVERRUN, {
              length: reader._data.length,
              count
            });
          }
        }
        let coders = [];
        for (let i = 0; i < count; i++) {
          coders.push(new AnonymousCoder(this.coder));
        }
        return reader.coerce(this.name, unpack(reader, coders));
      }
    };
  }
});

// ../../node_modules/@ethersproject/abi/lib.esm/coders/boolean.js
var BooleanCoder;
var init_boolean = __esm({
  "../../node_modules/@ethersproject/abi/lib.esm/coders/boolean.js"() {
    "use strict";
    init_abstract_coder();
    BooleanCoder = class extends Coder {
      constructor(localName) {
        super("bool", "bool", localName, false);
      }
      defaultValue() {
        return false;
      }
      encode(writer, value) {
        return writer.writeValue(value ? 1 : 0);
      }
      decode(reader) {
        return reader.coerce(this.type, !reader.readValue().isZero());
      }
    };
  }
});

// ../../node_modules/@ethersproject/abi/lib.esm/coders/bytes.js
var DynamicBytesCoder, BytesCoder;
var init_bytes = __esm({
  "../../node_modules/@ethersproject/abi/lib.esm/coders/bytes.js"() {
    "use strict";
    init_lib2();
    init_abstract_coder();
    DynamicBytesCoder = class extends Coder {
      constructor(type, localName) {
        super(type, type, localName, true);
      }
      defaultValue() {
        return "0x";
      }
      encode(writer, value) {
        value = arrayify(value);
        let length = writer.writeValue(value.length);
        length += writer.writeBytes(value);
        return length;
      }
      decode(reader) {
        return reader.readBytes(reader.readValue().toNumber(), true);
      }
    };
    BytesCoder = class extends DynamicBytesCoder {
      constructor(localName) {
        super("bytes", localName);
      }
      decode(reader) {
        return reader.coerce(this.name, hexlify(super.decode(reader)));
      }
    };
  }
});

// ../../node_modules/@ethersproject/abi/lib.esm/coders/fixed-bytes.js
var FixedBytesCoder;
var init_fixed_bytes = __esm({
  "../../node_modules/@ethersproject/abi/lib.esm/coders/fixed-bytes.js"() {
    "use strict";
    init_lib2();
    init_abstract_coder();
    FixedBytesCoder = class extends Coder {
      constructor(size, localName) {
        let name = "bytes" + String(size);
        super(name, name, localName, false);
        this.size = size;
      }
      defaultValue() {
        return "0x0000000000000000000000000000000000000000000000000000000000000000".substring(0, 2 + this.size * 2);
      }
      encode(writer, value) {
        let data = arrayify(value);
        if (data.length !== this.size) {
          this._throwError("incorrect data length", value);
        }
        return writer.writeBytes(data);
      }
      decode(reader) {
        return reader.coerce(this.name, hexlify(reader.readBytes(this.size)));
      }
    };
  }
});

// ../../node_modules/@ethersproject/abi/lib.esm/coders/null.js
var NullCoder;
var init_null = __esm({
  "../../node_modules/@ethersproject/abi/lib.esm/coders/null.js"() {
    "use strict";
    init_abstract_coder();
    NullCoder = class extends Coder {
      constructor(localName) {
        super("null", "", localName, false);
      }
      defaultValue() {
        return null;
      }
      encode(writer, value) {
        if (value != null) {
          this._throwError("not null", value);
        }
        return writer.writeBytes([]);
      }
      decode(reader) {
        reader.readBytes(0);
        return reader.coerce(this.name, null);
      }
    };
  }
});

// ../../node_modules/@ethersproject/constants/lib.esm/bignumbers.js
var NegativeOne2, Zero2, One, MaxUint256;
var init_bignumbers = __esm({
  "../../node_modules/@ethersproject/constants/lib.esm/bignumbers.js"() {
    "use strict";
    init_lib3();
    NegativeOne2 = /* @__PURE__ */ BigNumber.from(-1);
    Zero2 = /* @__PURE__ */ BigNumber.from(0);
    One = /* @__PURE__ */ BigNumber.from(1);
    MaxUint256 = /* @__PURE__ */ BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
  }
});

// ../../node_modules/@ethersproject/constants/lib.esm/hashes.js
var HashZero;
var init_hashes = __esm({
  "../../node_modules/@ethersproject/constants/lib.esm/hashes.js"() {
    "use strict";
    HashZero = "0x0000000000000000000000000000000000000000000000000000000000000000";
  }
});

// ../../node_modules/@ethersproject/constants/lib.esm/index.js
var init_lib8 = __esm({
  "../../node_modules/@ethersproject/constants/lib.esm/index.js"() {
    "use strict";
    init_bignumbers();
    init_hashes();
  }
});

// ../../node_modules/@ethersproject/abi/lib.esm/coders/number.js
var NumberCoder;
var init_number = __esm({
  "../../node_modules/@ethersproject/abi/lib.esm/coders/number.js"() {
    "use strict";
    init_lib3();
    init_lib8();
    init_abstract_coder();
    NumberCoder = class extends Coder {
      constructor(size, signed2, localName) {
        const name = (signed2 ? "int" : "uint") + size * 8;
        super(name, name, localName, false);
        this.size = size;
        this.signed = signed2;
      }
      defaultValue() {
        return 0;
      }
      encode(writer, value) {
        let v = BigNumber.from(value);
        let maxUintValue = MaxUint256.mask(writer.wordSize * 8);
        if (this.signed) {
          let bounds = maxUintValue.mask(this.size * 8 - 1);
          if (v.gt(bounds) || v.lt(bounds.add(One).mul(NegativeOne2))) {
            this._throwError("value out-of-bounds", value);
          }
        } else if (v.lt(Zero2) || v.gt(maxUintValue.mask(this.size * 8))) {
          this._throwError("value out-of-bounds", value);
        }
        v = v.toTwos(this.size * 8).mask(this.size * 8);
        if (this.signed) {
          v = v.fromTwos(this.size * 8).toTwos(8 * writer.wordSize);
        }
        return writer.writeValue(v);
      }
      decode(reader) {
        let value = reader.readValue().mask(this.size * 8);
        if (this.signed) {
          value = value.fromTwos(this.size * 8);
        }
        return reader.coerce(this.name, value);
      }
    };
  }
});

// ../../node_modules/@ethersproject/strings/lib.esm/_version.js
var version8;
var init_version8 = __esm({
  "../../node_modules/@ethersproject/strings/lib.esm/_version.js"() {
    "use strict";
    version8 = "strings/5.8.0";
  }
});

// ../../node_modules/@ethersproject/strings/lib.esm/utf8.js
function errorFunc(reason, offset, bytes, output, badCodepoint) {
  return logger10.throwArgumentError(`invalid codepoint at offset ${offset}; ${reason}`, "bytes", bytes);
}
function ignoreFunc(reason, offset, bytes, output, badCodepoint) {
  if (reason === Utf8ErrorReason.BAD_PREFIX || reason === Utf8ErrorReason.UNEXPECTED_CONTINUE) {
    let i = 0;
    for (let o = offset + 1; o < bytes.length; o++) {
      if (bytes[o] >> 6 !== 2) {
        break;
      }
      i++;
    }
    return i;
  }
  if (reason === Utf8ErrorReason.OVERRUN) {
    return bytes.length - offset - 1;
  }
  return 0;
}
function replaceFunc(reason, offset, bytes, output, badCodepoint) {
  if (reason === Utf8ErrorReason.OVERLONG) {
    output.push(badCodepoint);
    return 0;
  }
  output.push(65533);
  return ignoreFunc(reason, offset, bytes, output, badCodepoint);
}
function getUtf8CodePoints(bytes, onError) {
  if (onError == null) {
    onError = Utf8ErrorFuncs.error;
  }
  bytes = arrayify(bytes);
  const result = [];
  let i = 0;
  while (i < bytes.length) {
    const c = bytes[i++];
    if (c >> 7 === 0) {
      result.push(c);
      continue;
    }
    let extraLength = null;
    let overlongMask = null;
    if ((c & 224) === 192) {
      extraLength = 1;
      overlongMask = 127;
    } else if ((c & 240) === 224) {
      extraLength = 2;
      overlongMask = 2047;
    } else if ((c & 248) === 240) {
      extraLength = 3;
      overlongMask = 65535;
    } else {
      if ((c & 192) === 128) {
        i += onError(Utf8ErrorReason.UNEXPECTED_CONTINUE, i - 1, bytes, result);
      } else {
        i += onError(Utf8ErrorReason.BAD_PREFIX, i - 1, bytes, result);
      }
      continue;
    }
    if (i - 1 + extraLength >= bytes.length) {
      i += onError(Utf8ErrorReason.OVERRUN, i - 1, bytes, result);
      continue;
    }
    let res = c & (1 << 8 - extraLength - 1) - 1;
    for (let j = 0; j < extraLength; j++) {
      let nextChar = bytes[i];
      if ((nextChar & 192) != 128) {
        i += onError(Utf8ErrorReason.MISSING_CONTINUE, i, bytes, result);
        res = null;
        break;
      }
      ;
      res = res << 6 | nextChar & 63;
      i++;
    }
    if (res === null) {
      continue;
    }
    if (res > 1114111) {
      i += onError(Utf8ErrorReason.OUT_OF_RANGE, i - 1 - extraLength, bytes, result, res);
      continue;
    }
    if (res >= 55296 && res <= 57343) {
      i += onError(Utf8ErrorReason.UTF16_SURROGATE, i - 1 - extraLength, bytes, result, res);
      continue;
    }
    if (res <= overlongMask) {
      i += onError(Utf8ErrorReason.OVERLONG, i - 1 - extraLength, bytes, result, res);
      continue;
    }
    result.push(res);
  }
  return result;
}
function toUtf8Bytes(str, form = UnicodeNormalizationForm.current) {
  if (form != UnicodeNormalizationForm.current) {
    logger10.checkNormalize();
    str = str.normalize(form);
  }
  let result = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 128) {
      result.push(c);
    } else if (c < 2048) {
      result.push(c >> 6 | 192);
      result.push(c & 63 | 128);
    } else if ((c & 64512) == 55296) {
      i++;
      const c2 = str.charCodeAt(i);
      if (i >= str.length || (c2 & 64512) !== 56320) {
        throw new Error("invalid utf-8 string");
      }
      const pair = 65536 + ((c & 1023) << 10) + (c2 & 1023);
      result.push(pair >> 18 | 240);
      result.push(pair >> 12 & 63 | 128);
      result.push(pair >> 6 & 63 | 128);
      result.push(pair & 63 | 128);
    } else {
      result.push(c >> 12 | 224);
      result.push(c >> 6 & 63 | 128);
      result.push(c & 63 | 128);
    }
  }
  return arrayify(result);
}
function escapeChar(value) {
  const hex = "0000" + value.toString(16);
  return "\\u" + hex.substring(hex.length - 4);
}
function _toEscapedUtf8String(bytes, onError) {
  return '"' + getUtf8CodePoints(bytes, onError).map((codePoint) => {
    if (codePoint < 256) {
      switch (codePoint) {
        case 8:
          return "\\b";
        case 9:
          return "\\t";
        case 10:
          return "\\n";
        case 13:
          return "\\r";
        case 34:
          return '\\"';
        case 92:
          return "\\\\";
      }
      if (codePoint >= 32 && codePoint < 127) {
        return String.fromCharCode(codePoint);
      }
    }
    if (codePoint <= 65535) {
      return escapeChar(codePoint);
    }
    codePoint -= 65536;
    return escapeChar((codePoint >> 10 & 1023) + 55296) + escapeChar((codePoint & 1023) + 56320);
  }).join("") + '"';
}
function _toUtf8String(codePoints) {
  return codePoints.map((codePoint) => {
    if (codePoint <= 65535) {
      return String.fromCharCode(codePoint);
    }
    codePoint -= 65536;
    return String.fromCharCode((codePoint >> 10 & 1023) + 55296, (codePoint & 1023) + 56320);
  }).join("");
}
function toUtf8String(bytes, onError) {
  return _toUtf8String(getUtf8CodePoints(bytes, onError));
}
function toUtf8CodePoints(str, form = UnicodeNormalizationForm.current) {
  return getUtf8CodePoints(toUtf8Bytes(str, form));
}
var logger10, UnicodeNormalizationForm, Utf8ErrorReason, Utf8ErrorFuncs;
var init_utf8 = __esm({
  "../../node_modules/@ethersproject/strings/lib.esm/utf8.js"() {
    "use strict";
    init_lib2();
    init_lib();
    init_version8();
    logger10 = new Logger(version8);
    (function(UnicodeNormalizationForm2) {
      UnicodeNormalizationForm2["current"] = "";
      UnicodeNormalizationForm2["NFC"] = "NFC";
      UnicodeNormalizationForm2["NFD"] = "NFD";
      UnicodeNormalizationForm2["NFKC"] = "NFKC";
      UnicodeNormalizationForm2["NFKD"] = "NFKD";
    })(UnicodeNormalizationForm || (UnicodeNormalizationForm = {}));
    (function(Utf8ErrorReason2) {
      Utf8ErrorReason2["UNEXPECTED_CONTINUE"] = "unexpected continuation byte";
      Utf8ErrorReason2["BAD_PREFIX"] = "bad codepoint prefix";
      Utf8ErrorReason2["OVERRUN"] = "string overrun";
      Utf8ErrorReason2["MISSING_CONTINUE"] = "missing continuation byte";
      Utf8ErrorReason2["OUT_OF_RANGE"] = "out of UTF-8 range";
      Utf8ErrorReason2["UTF16_SURROGATE"] = "UTF-16 surrogate";
      Utf8ErrorReason2["OVERLONG"] = "overlong representation";
    })(Utf8ErrorReason || (Utf8ErrorReason = {}));
    Utf8ErrorFuncs = Object.freeze({
      error: errorFunc,
      ignore: ignoreFunc,
      replace: replaceFunc
    });
  }
});

// ../../node_modules/@ethersproject/strings/lib.esm/bytes32.js
function formatBytes32String(text) {
  const bytes = toUtf8Bytes(text);
  if (bytes.length > 31) {
    throw new Error("bytes32 string must be less than 32 bytes");
  }
  return hexlify(concat([bytes, HashZero]).slice(0, 32));
}
function parseBytes32String(bytes) {
  const data = arrayify(bytes);
  if (data.length !== 32) {
    throw new Error("invalid bytes32 - not 32 bytes long");
  }
  if (data[31] !== 0) {
    throw new Error("invalid bytes32 string - no null terminator");
  }
  let length = 31;
  while (data[length - 1] === 0) {
    length--;
  }
  return toUtf8String(data.slice(0, length));
}
var init_bytes32 = __esm({
  "../../node_modules/@ethersproject/strings/lib.esm/bytes32.js"() {
    "use strict";
    init_lib8();
    init_lib2();
    init_utf8();
  }
});

// ../../node_modules/@ethersproject/strings/lib.esm/idna.js
function bytes2(data) {
  if (data.length % 4 !== 0) {
    throw new Error("bad data");
  }
  let result = [];
  for (let i = 0; i < data.length; i += 4) {
    result.push(parseInt(data.substring(i, i + 4), 16));
  }
  return result;
}
function createTable(data, func) {
  if (!func) {
    func = function(value) {
      return [parseInt(value, 16)];
    };
  }
  let lo = 0;
  let result = {};
  data.split(",").forEach((pair) => {
    let comps = pair.split(":");
    lo += parseInt(comps[0], 16);
    result[lo] = func(comps[1]);
  });
  return result;
}
function createRangeTable(data) {
  let hi = 0;
  return data.split(",").map((v) => {
    let comps = v.split("-");
    if (comps.length === 1) {
      comps[1] = "0";
    } else if (comps[1] === "") {
      comps[1] = "1";
    }
    let lo = hi + parseInt(comps[0], 16);
    hi = parseInt(comps[1], 16);
    return { l: lo, h: hi };
  });
}
function matchMap(value, ranges) {
  let lo = 0;
  for (let i = 0; i < ranges.length; i++) {
    let range = ranges[i];
    lo += range.l;
    if (value >= lo && value <= lo + range.h && (value - lo) % (range.d || 1) === 0) {
      if (range.e && range.e.indexOf(value - lo) !== -1) {
        continue;
      }
      return range;
    }
  }
  return null;
}
function flatten(values) {
  return values.reduce((accum, value) => {
    value.forEach((value2) => {
      accum.push(value2);
    });
    return accum;
  }, []);
}
function _nameprepTableA1(codepoint) {
  return !!matchMap(codepoint, Table_A_1_ranges);
}
function _nameprepTableB2(codepoint) {
  let range = matchMap(codepoint, Table_B_2_ranges);
  if (range) {
    return [codepoint + range.s];
  }
  let codes = Table_B_2_lut_abs[codepoint];
  if (codes) {
    return codes;
  }
  let shift = Table_B_2_lut_rel[codepoint];
  if (shift) {
    return [codepoint + shift[0]];
  }
  let complex = Table_B_2_complex[codepoint];
  if (complex) {
    return complex;
  }
  return null;
}
function _nameprepTableC(codepoint) {
  return !!matchMap(codepoint, Table_C_ranges);
}
function nameprep(value) {
  if (value.match(/^[a-z0-9-]*$/i) && value.length <= 59) {
    return value.toLowerCase();
  }
  let codes = toUtf8CodePoints(value);
  codes = flatten(codes.map((code) => {
    if (Table_B_1_flags.indexOf(code) >= 0) {
      return [];
    }
    if (code >= 65024 && code <= 65039) {
      return [];
    }
    let codesTableB2 = _nameprepTableB2(code);
    if (codesTableB2) {
      return codesTableB2;
    }
    return [code];
  }));
  codes = toUtf8CodePoints(_toUtf8String(codes), UnicodeNormalizationForm.NFKC);
  codes.forEach((code) => {
    if (_nameprepTableC(code)) {
      throw new Error("STRINGPREP_CONTAINS_PROHIBITED");
    }
  });
  codes.forEach((code) => {
    if (_nameprepTableA1(code)) {
      throw new Error("STRINGPREP_CONTAINS_UNASSIGNED");
    }
  });
  let name = _toUtf8String(codes);
  if (name.substring(0, 1) === "-" || name.substring(2, 4) === "--" || name.substring(name.length - 1) === "-") {
    throw new Error("invalid hyphen");
  }
  return name;
}
var Table_A_1_ranges, Table_B_1_flags, Table_B_2_ranges, Table_B_2_lut_abs, Table_B_2_lut_rel, Table_B_2_complex, Table_C_ranges;
var init_idna = __esm({
  "../../node_modules/@ethersproject/strings/lib.esm/idna.js"() {
    "use strict";
    init_utf8();
    Table_A_1_ranges = createRangeTable("221,13-1b,5f-,40-10,51-f,11-3,3-3,2-2,2-4,8,2,15,2d,28-8,88,48,27-,3-5,11-20,27-,8,28,3-5,12,18,b-a,1c-4,6-16,2-d,2-2,2,1b-4,17-9,8f-,10,f,1f-2,1c-34,33-14e,4,36-,13-,6-2,1a-f,4,9-,3-,17,8,2-2,5-,2,8-,3-,4-8,2-3,3,6-,16-6,2-,7-3,3-,17,8,3,3,3-,2,6-3,3-,4-a,5,2-6,10-b,4,8,2,4,17,8,3,6-,b,4,4-,2-e,2-4,b-10,4,9-,3-,17,8,3-,5-,9-2,3-,4-7,3-3,3,4-3,c-10,3,7-2,4,5-2,3,2,3-2,3-2,4-2,9,4-3,6-2,4,5-8,2-e,d-d,4,9,4,18,b,6-3,8,4,5-6,3-8,3-3,b-11,3,9,4,18,b,6-3,8,4,5-6,3-6,2,3-3,b-11,3,9,4,18,11-3,7-,4,5-8,2-7,3-3,b-11,3,13-2,19,a,2-,8-2,2-3,7,2,9-11,4-b,3b-3,1e-24,3,2-,3,2-,2-5,5,8,4,2,2-,3,e,4-,6,2,7-,b-,3-21,49,23-5,1c-3,9,25,10-,2-2f,23,6,3,8-2,5-5,1b-45,27-9,2a-,2-3,5b-4,45-4,53-5,8,40,2,5-,8,2,5-,28,2,5-,20,2,5-,8,2,5-,8,8,18,20,2,5-,8,28,14-5,1d-22,56-b,277-8,1e-2,52-e,e,8-a,18-8,15-b,e,4,3-b,5e-2,b-15,10,b-5,59-7,2b-555,9d-3,5b-5,17-,7-,27-,7-,9,2,2,2,20-,36,10,f-,7,14-,4,a,54-3,2-6,6-5,9-,1c-10,13-1d,1c-14,3c-,10-6,32-b,240-30,28-18,c-14,a0,115-,3,66-,b-76,5,5-,1d,24,2,5-2,2,8-,35-2,19,f-10,1d-3,311-37f,1b,5a-b,d7-19,d-3,41,57-,68-4,29-3,5f,29-37,2e-2,25-c,2c-2,4e-3,30,78-3,64-,20,19b7-49,51a7-59,48e-2,38-738,2ba5-5b,222f-,3c-94,8-b,6-4,1b,6,2,3,3,6d-20,16e-f,41-,37-7,2e-2,11-f,5-b,18-,b,14,5-3,6,88-,2,bf-2,7-,7-,7-,4-2,8,8-9,8-2ff,20,5-b,1c-b4,27-,27-cbb1,f7-9,28-2,b5-221,56,48,3-,2-,3-,5,d,2,5,3,42,5-,9,8,1d,5,6,2-2,8,153-3,123-3,33-27fd,a6da-5128,21f-5df,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3,2-1d,61-ff7d");
    Table_B_1_flags = "ad,34f,1806,180b,180c,180d,200b,200c,200d,2060,feff".split(",").map((v) => parseInt(v, 16));
    Table_B_2_ranges = [
      { h: 25, s: 32, l: 65 },
      { h: 30, s: 32, e: [23], l: 127 },
      { h: 54, s: 1, e: [48], l: 64, d: 2 },
      { h: 14, s: 1, l: 57, d: 2 },
      { h: 44, s: 1, l: 17, d: 2 },
      { h: 10, s: 1, e: [2, 6, 8], l: 61, d: 2 },
      { h: 16, s: 1, l: 68, d: 2 },
      { h: 84, s: 1, e: [18, 24, 66], l: 19, d: 2 },
      { h: 26, s: 32, e: [17], l: 435 },
      { h: 22, s: 1, l: 71, d: 2 },
      { h: 15, s: 80, l: 40 },
      { h: 31, s: 32, l: 16 },
      { h: 32, s: 1, l: 80, d: 2 },
      { h: 52, s: 1, l: 42, d: 2 },
      { h: 12, s: 1, l: 55, d: 2 },
      { h: 40, s: 1, e: [38], l: 15, d: 2 },
      { h: 14, s: 1, l: 48, d: 2 },
      { h: 37, s: 48, l: 49 },
      { h: 148, s: 1, l: 6351, d: 2 },
      { h: 88, s: 1, l: 160, d: 2 },
      { h: 15, s: 16, l: 704 },
      { h: 25, s: 26, l: 854 },
      { h: 25, s: 32, l: 55915 },
      { h: 37, s: 40, l: 1247 },
      { h: 25, s: -119711, l: 53248 },
      { h: 25, s: -119763, l: 52 },
      { h: 25, s: -119815, l: 52 },
      { h: 25, s: -119867, e: [1, 4, 5, 7, 8, 11, 12, 17], l: 52 },
      { h: 25, s: -119919, l: 52 },
      { h: 24, s: -119971, e: [2, 7, 8, 17], l: 52 },
      { h: 24, s: -120023, e: [2, 7, 13, 15, 16, 17], l: 52 },
      { h: 25, s: -120075, l: 52 },
      { h: 25, s: -120127, l: 52 },
      { h: 25, s: -120179, l: 52 },
      { h: 25, s: -120231, l: 52 },
      { h: 25, s: -120283, l: 52 },
      { h: 25, s: -120335, l: 52 },
      { h: 24, s: -119543, e: [17], l: 56 },
      { h: 24, s: -119601, e: [17], l: 58 },
      { h: 24, s: -119659, e: [17], l: 58 },
      { h: 24, s: -119717, e: [17], l: 58 },
      { h: 24, s: -119775, e: [17], l: 58 }
    ];
    Table_B_2_lut_abs = createTable("b5:3bc,c3:ff,7:73,2:253,5:254,3:256,1:257,5:259,1:25b,3:260,1:263,2:269,1:268,5:26f,1:272,2:275,7:280,3:283,5:288,3:28a,1:28b,5:292,3f:195,1:1bf,29:19e,125:3b9,8b:3b2,1:3b8,1:3c5,3:3c6,1:3c0,1a:3ba,1:3c1,1:3c3,2:3b8,1:3b5,1bc9:3b9,1c:1f76,1:1f77,f:1f7a,1:1f7b,d:1f78,1:1f79,1:1f7c,1:1f7d,107:63,5:25b,4:68,1:68,1:68,3:69,1:69,1:6c,3:6e,4:70,1:71,1:72,1:72,1:72,7:7a,2:3c9,2:7a,2:6b,1:e5,1:62,1:63,3:65,1:66,2:6d,b:3b3,1:3c0,6:64,1b574:3b8,1a:3c3,20:3b8,1a:3c3,20:3b8,1a:3c3,20:3b8,1a:3c3,20:3b8,1a:3c3");
    Table_B_2_lut_rel = createTable("179:1,2:1,2:1,5:1,2:1,a:4f,a:1,8:1,2:1,2:1,3:1,5:1,3:1,4:1,2:1,3:1,4:1,8:2,1:1,2:2,1:1,2:2,27:2,195:26,2:25,1:25,1:25,2:40,2:3f,1:3f,33:1,11:-6,1:-9,1ac7:-3a,6d:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,9:-8,1:-8,1:-8,1:-8,1:-8,1:-8,b:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,9:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,9:-8,1:-8,1:-8,1:-8,1:-8,1:-8,c:-8,2:-8,2:-8,2:-8,9:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,49:-8,1:-8,1:-4a,1:-4a,d:-56,1:-56,1:-56,1:-56,d:-8,1:-8,f:-8,1:-8,3:-7");
    Table_B_2_complex = createTable("df:00730073,51:00690307,19:02BC006E,a7:006A030C,18a:002003B9,16:03B903080301,20:03C503080301,1d7:05650582,190f:00680331,1:00740308,1:0077030A,1:0079030A,1:006102BE,b6:03C50313,2:03C503130300,2:03C503130301,2:03C503130342,2a:1F0003B9,1:1F0103B9,1:1F0203B9,1:1F0303B9,1:1F0403B9,1:1F0503B9,1:1F0603B9,1:1F0703B9,1:1F0003B9,1:1F0103B9,1:1F0203B9,1:1F0303B9,1:1F0403B9,1:1F0503B9,1:1F0603B9,1:1F0703B9,1:1F2003B9,1:1F2103B9,1:1F2203B9,1:1F2303B9,1:1F2403B9,1:1F2503B9,1:1F2603B9,1:1F2703B9,1:1F2003B9,1:1F2103B9,1:1F2203B9,1:1F2303B9,1:1F2403B9,1:1F2503B9,1:1F2603B9,1:1F2703B9,1:1F6003B9,1:1F6103B9,1:1F6203B9,1:1F6303B9,1:1F6403B9,1:1F6503B9,1:1F6603B9,1:1F6703B9,1:1F6003B9,1:1F6103B9,1:1F6203B9,1:1F6303B9,1:1F6403B9,1:1F6503B9,1:1F6603B9,1:1F6703B9,3:1F7003B9,1:03B103B9,1:03AC03B9,2:03B10342,1:03B1034203B9,5:03B103B9,6:1F7403B9,1:03B703B9,1:03AE03B9,2:03B70342,1:03B7034203B9,5:03B703B9,6:03B903080300,1:03B903080301,3:03B90342,1:03B903080342,b:03C503080300,1:03C503080301,1:03C10313,2:03C50342,1:03C503080342,b:1F7C03B9,1:03C903B9,1:03CE03B9,2:03C90342,1:03C9034203B9,5:03C903B9,ac:00720073,5b:00B00063,6:00B00066,d:006E006F,a:0073006D,1:00740065006C,1:0074006D,124f:006800700061,2:00610075,2:006F0076,b:00700061,1:006E0061,1:03BC0061,1:006D0061,1:006B0061,1:006B0062,1:006D0062,1:00670062,3:00700066,1:006E0066,1:03BC0066,4:0068007A,1:006B0068007A,1:006D0068007A,1:00670068007A,1:00740068007A,15:00700061,1:006B00700061,1:006D00700061,1:006700700061,8:00700076,1:006E0076,1:03BC0076,1:006D0076,1:006B0076,1:006D0076,1:00700077,1:006E0077,1:03BC0077,1:006D0077,1:006B0077,1:006D0077,1:006B03C9,1:006D03C9,2:00620071,3:00632215006B0067,1:0063006F002E,1:00640062,1:00670079,2:00680070,2:006B006B,1:006B006D,9:00700068,2:00700070006D,1:00700072,2:00730076,1:00770062,c723:00660066,1:00660069,1:0066006C,1:006600660069,1:00660066006C,1:00730074,1:00730074,d:05740576,1:05740565,1:0574056B,1:057E0576,1:0574056D", bytes2);
    Table_C_ranges = createRangeTable("80-20,2a0-,39c,32,f71,18e,7f2-f,19-7,30-4,7-5,f81-b,5,a800-20ff,4d1-1f,110,fa-6,d174-7,2e84-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,2,1f-5f,ff7f-20001");
  }
});

// ../../node_modules/@ethersproject/strings/lib.esm/index.js
var lib_exports7 = {};
__export(lib_exports7, {
  UnicodeNormalizationForm: () => UnicodeNormalizationForm,
  Utf8ErrorFuncs: () => Utf8ErrorFuncs,
  Utf8ErrorReason: () => Utf8ErrorReason,
  _toEscapedUtf8String: () => _toEscapedUtf8String,
  formatBytes32String: () => formatBytes32String,
  nameprep: () => nameprep,
  parseBytes32String: () => parseBytes32String,
  toUtf8Bytes: () => toUtf8Bytes,
  toUtf8CodePoints: () => toUtf8CodePoints,
  toUtf8String: () => toUtf8String
});
var init_lib9 = __esm({
  "../../node_modules/@ethersproject/strings/lib.esm/index.js"() {
    "use strict";
    init_bytes32();
    init_idna();
    init_utf8();
  }
});

// ../../node_modules/@ethersproject/abi/lib.esm/coders/string.js
var StringCoder;
var init_string = __esm({
  "../../node_modules/@ethersproject/abi/lib.esm/coders/string.js"() {
    "use strict";
    init_lib9();
    init_bytes();
    StringCoder = class extends DynamicBytesCoder {
      constructor(localName) {
        super("string", localName);
      }
      defaultValue() {
        return "";
      }
      encode(writer, value) {
        return super.encode(writer, toUtf8Bytes(value));
      }
      decode(reader) {
        return toUtf8String(super.decode(reader));
      }
    };
  }
});

// ../../node_modules/@ethersproject/abi/lib.esm/coders/tuple.js
var TupleCoder;
var init_tuple = __esm({
  "../../node_modules/@ethersproject/abi/lib.esm/coders/tuple.js"() {
    "use strict";
    init_abstract_coder();
    init_array();
    TupleCoder = class extends Coder {
      constructor(coders, localName) {
        let dynamic = false;
        const types = [];
        coders.forEach((coder) => {
          if (coder.dynamic) {
            dynamic = true;
          }
          types.push(coder.type);
        });
        const type = "tuple(" + types.join(",") + ")";
        super("tuple", type, localName, dynamic);
        this.coders = coders;
      }
      defaultValue() {
        const values = [];
        this.coders.forEach((coder) => {
          values.push(coder.defaultValue());
        });
        const uniqueNames = this.coders.reduce((accum, coder) => {
          const name = coder.localName;
          if (name) {
            if (!accum[name]) {
              accum[name] = 0;
            }
            accum[name]++;
          }
          return accum;
        }, {});
        this.coders.forEach((coder, index) => {
          let name = coder.localName;
          if (!name || uniqueNames[name] !== 1) {
            return;
          }
          if (name === "length") {
            name = "_length";
          }
          if (values[name] != null) {
            return;
          }
          values[name] = values[index];
        });
        return Object.freeze(values);
      }
      encode(writer, value) {
        return pack(writer, this.coders, value);
      }
      decode(reader) {
        return reader.coerce(this.name, unpack(reader, this.coders));
      }
    };
  }
});

// ../../node_modules/@ethersproject/abi/lib.esm/abi-coder.js
var logger11, paramTypeBytes, paramTypeNumber, AbiCoder, defaultAbiCoder;
var init_abi_coder = __esm({
  "../../node_modules/@ethersproject/abi/lib.esm/abi-coder.js"() {
    "use strict";
    init_lib2();
    init_lib4();
    init_lib();
    init_version5();
    init_abstract_coder();
    init_address();
    init_array();
    init_boolean();
    init_bytes();
    init_fixed_bytes();
    init_null();
    init_number();
    init_string();
    init_tuple();
    init_fragments();
    logger11 = new Logger(version5);
    paramTypeBytes = new RegExp(/^bytes([0-9]*)$/);
    paramTypeNumber = new RegExp(/^(u?int)([0-9]*)$/);
    AbiCoder = class {
      constructor(coerceFunc) {
        defineReadOnly(this, "coerceFunc", coerceFunc || null);
      }
      _getCoder(param) {
        switch (param.baseType) {
          case "address":
            return new AddressCoder(param.name);
          case "bool":
            return new BooleanCoder(param.name);
          case "string":
            return new StringCoder(param.name);
          case "bytes":
            return new BytesCoder(param.name);
          case "array":
            return new ArrayCoder(this._getCoder(param.arrayChildren), param.arrayLength, param.name);
          case "tuple":
            return new TupleCoder((param.components || []).map((component) => {
              return this._getCoder(component);
            }), param.name);
          case "":
            return new NullCoder(param.name);
        }
        let match = param.type.match(paramTypeNumber);
        if (match) {
          let size = parseInt(match[2] || "256");
          if (size === 0 || size > 256 || size % 8 !== 0) {
            logger11.throwArgumentError("invalid " + match[1] + " bit length", "param", param);
          }
          return new NumberCoder(size / 8, match[1] === "int", param.name);
        }
        match = param.type.match(paramTypeBytes);
        if (match) {
          let size = parseInt(match[1]);
          if (size === 0 || size > 32) {
            logger11.throwArgumentError("invalid bytes length", "param", param);
          }
          return new FixedBytesCoder(size, param.name);
        }
        return logger11.throwArgumentError("invalid type", "type", param.type);
      }
      _getWordSize() {
        return 32;
      }
      _getReader(data, allowLoose) {
        return new Reader(data, this._getWordSize(), this.coerceFunc, allowLoose);
      }
      _getWriter() {
        return new Writer(this._getWordSize());
      }
      getDefaultValue(types) {
        const coders = types.map((type) => this._getCoder(ParamType.from(type)));
        const coder = new TupleCoder(coders, "_");
        return coder.defaultValue();
      }
      encode(types, values) {
        if (types.length !== values.length) {
          logger11.throwError("types/values length mismatch", Logger.errors.INVALID_ARGUMENT, {
            count: { types: types.length, values: values.length },
            value: { types, values }
          });
        }
        const coders = types.map((type) => this._getCoder(ParamType.from(type)));
        const coder = new TupleCoder(coders, "_");
        const writer = this._getWriter();
        coder.encode(writer, values);
        return writer.data;
      }
      decode(types, data, loose) {
        const coders = types.map((type) => this._getCoder(ParamType.from(type)));
        const coder = new TupleCoder(coders, "_");
        return coder.decode(this._getReader(arrayify(data), loose));
      }
    };
    defaultAbiCoder = new AbiCoder();
  }
});

// ../../node_modules/@ethersproject/hash/lib.esm/id.js
function id(text) {
  return keccak256(toUtf8Bytes(text));
}
var init_id = __esm({
  "../../node_modules/@ethersproject/hash/lib.esm/id.js"() {
    "use strict";
    init_lib5();
    init_lib9();
  }
});

// ../../node_modules/@ethersproject/hash/lib.esm/_version.js
var version9;
var init_version9 = __esm({
  "../../node_modules/@ethersproject/hash/lib.esm/_version.js"() {
    "use strict";
    version9 = "hash/5.8.0";
  }
});

// ../../node_modules/@ethersproject/base64/lib.esm/base64.js
function decode2(textData) {
  textData = atob(textData);
  const data = [];
  for (let i = 0; i < textData.length; i++) {
    data.push(textData.charCodeAt(i));
  }
  return arrayify(data);
}
function encode2(data) {
  data = arrayify(data);
  let textData = "";
  for (let i = 0; i < data.length; i++) {
    textData += String.fromCharCode(data[i]);
  }
  return btoa(textData);
}
var init_base64 = __esm({
  "../../node_modules/@ethersproject/base64/lib.esm/base64.js"() {
    "use strict";
    init_lib2();
  }
});

// ../../node_modules/@ethersproject/base64/lib.esm/index.js
var lib_exports8 = {};
__export(lib_exports8, {
  decode: () => decode2,
  encode: () => encode2
});
var init_lib10 = __esm({
  "../../node_modules/@ethersproject/base64/lib.esm/index.js"() {
    "use strict";
    init_base64();
  }
});

// ../../node_modules/@ethersproject/hash/lib.esm/ens-normalize/decoder.js
function flat(array, depth) {
  if (depth == null) {
    depth = 1;
  }
  const result = [];
  const forEach = result.forEach;
  const flatDeep = function(arr, depth2) {
    forEach.call(arr, function(val) {
      if (depth2 > 0 && Array.isArray(val)) {
        flatDeep(val, depth2 - 1);
      } else {
        result.push(val);
      }
    });
  };
  flatDeep(array, depth);
  return result;
}
function fromEntries(array) {
  const result = {};
  for (let i = 0; i < array.length; i++) {
    const value = array[i];
    result[value[0]] = value[1];
  }
  return result;
}
function decode_arithmetic(bytes) {
  let pos = 0;
  function u16() {
    return bytes[pos++] << 8 | bytes[pos++];
  }
  let symbol_count = u16();
  let total = 1;
  let acc = [0, 1];
  for (let i = 1; i < symbol_count; i++) {
    acc.push(total += u16());
  }
  let skip = u16();
  let pos_payload = pos;
  pos += skip;
  let read_width = 0;
  let read_buffer = 0;
  function read_bit() {
    if (read_width == 0) {
      read_buffer = read_buffer << 8 | bytes[pos++];
      read_width = 8;
    }
    return read_buffer >> --read_width & 1;
  }
  const N2 = 31;
  const FULL = Math.pow(2, N2);
  const HALF = FULL >>> 1;
  const QRTR = HALF >> 1;
  const MASK = FULL - 1;
  let register = 0;
  for (let i = 0; i < N2; i++)
    register = register << 1 | read_bit();
  let symbols = [];
  let low = 0;
  let range = FULL;
  while (true) {
    let value = Math.floor(((register - low + 1) * total - 1) / range);
    let start = 0;
    let end = symbol_count;
    while (end - start > 1) {
      let mid = start + end >>> 1;
      if (value < acc[mid]) {
        end = mid;
      } else {
        start = mid;
      }
    }
    if (start == 0)
      break;
    symbols.push(start);
    let a = low + Math.floor(range * acc[start] / total);
    let b = low + Math.floor(range * acc[start + 1] / total) - 1;
    while (((a ^ b) & HALF) == 0) {
      register = register << 1 & MASK | read_bit();
      a = a << 1 & MASK;
      b = b << 1 & MASK | 1;
    }
    while (a & ~b & QRTR) {
      register = register & HALF | register << 1 & MASK >>> 1 | read_bit();
      a = a << 1 ^ HALF;
      b = (b ^ HALF) << 1 | HALF | 1;
    }
    low = a;
    range = 1 + b - a;
  }
  let offset = symbol_count - 4;
  return symbols.map((x) => {
    switch (x - offset) {
      case 3:
        return offset + 65792 + (bytes[pos_payload++] << 16 | bytes[pos_payload++] << 8 | bytes[pos_payload++]);
      case 2:
        return offset + 256 + (bytes[pos_payload++] << 8 | bytes[pos_payload++]);
      case 1:
        return offset + bytes[pos_payload++];
      default:
        return x - 1;
    }
  });
}
function read_payload(v) {
  let pos = 0;
  return () => v[pos++];
}
function read_compressed_payload(bytes) {
  return read_payload(decode_arithmetic(bytes));
}
function signed(i) {
  return i & 1 ? ~i >> 1 : i >> 1;
}
function read_counts(n, next) {
  let v = Array(n);
  for (let i = 0; i < n; i++)
    v[i] = 1 + next();
  return v;
}
function read_ascending(n, next) {
  let v = Array(n);
  for (let i = 0, x = -1; i < n; i++)
    v[i] = x += 1 + next();
  return v;
}
function read_deltas(n, next) {
  let v = Array(n);
  for (let i = 0, x = 0; i < n; i++)
    v[i] = x += signed(next());
  return v;
}
function read_member_array(next, lookup) {
  let v = read_ascending(next(), next);
  let n = next();
  let vX = read_ascending(n, next);
  let vN = read_counts(n, next);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < vN[i]; j++) {
      v.push(vX[i] + j);
    }
  }
  return lookup ? v.map((x) => lookup[x]) : v;
}
function read_mapped_map(next) {
  let ret = [];
  while (true) {
    let w = next();
    if (w == 0)
      break;
    ret.push(read_linear_table(w, next));
  }
  while (true) {
    let w = next() - 1;
    if (w < 0)
      break;
    ret.push(read_replacement_table(w, next));
  }
  return fromEntries(flat(ret));
}
function read_zero_terminated_array(next) {
  let v = [];
  while (true) {
    let i = next();
    if (i == 0)
      break;
    v.push(i);
  }
  return v;
}
function read_transposed(n, w, next) {
  let m = Array(n).fill(void 0).map(() => []);
  for (let i = 0; i < w; i++) {
    read_deltas(n, next).forEach((x, j) => m[j].push(x));
  }
  return m;
}
function read_linear_table(w, next) {
  let dx = 1 + next();
  let dy = next();
  let vN = read_zero_terminated_array(next);
  let m = read_transposed(vN.length, 1 + w, next);
  return flat(m.map((v, i) => {
    const x = v[0], ys = v.slice(1);
    return Array(vN[i]).fill(void 0).map((_, j) => {
      let j_dy = j * dy;
      return [x + j * dx, ys.map((y) => y + j_dy)];
    });
  }));
}
function read_replacement_table(w, next) {
  let n = 1 + next();
  let m = read_transposed(n, 1 + w, next);
  return m.map((v) => [v[0], v.slice(1)]);
}
function read_emoji_trie(next) {
  let sorted = read_member_array(next).sort((a, b) => a - b);
  return read();
  function read() {
    let branches = [];
    while (true) {
      let keys = read_member_array(next, sorted);
      if (keys.length == 0)
        break;
      branches.push({ set: new Set(keys), node: read() });
    }
    branches.sort((a, b) => b.set.size - a.set.size);
    let temp = next();
    let valid = temp % 3;
    temp = temp / 3 | 0;
    let fe0f = !!(temp & 1);
    temp >>= 1;
    let save = temp == 1;
    let check = temp == 2;
    return { branches, valid, fe0f, save, check };
  }
}
var init_decoder = __esm({
  "../../node_modules/@ethersproject/hash/lib.esm/ens-normalize/decoder.js"() {
    "use strict";
  }
});

// ../../node_modules/@ethersproject/hash/lib.esm/ens-normalize/include.js
function getData() {
  return read_compressed_payload(decode2("AEQF2AO2DEsA2wIrAGsBRABxAN8AZwCcAEwAqgA0AGwAUgByADcATAAVAFYAIQAyACEAKAAYAFgAGwAjABQAMAAmADIAFAAfABQAKwATACoADgAbAA8AHQAYABoAGQAxADgALAAoADwAEwA9ABMAGgARAA4ADwAWABMAFgAIAA8AHgQXBYMA5BHJAS8JtAYoAe4AExozi0UAH21tAaMnBT8CrnIyhrMDhRgDygIBUAEHcoFHUPe8AXBjAewCjgDQR8IICIcEcQLwATXCDgzvHwBmBoHNAqsBdBcUAykgDhAMShskMgo8AY8jqAQfAUAfHw8BDw87MioGlCIPBwZCa4ELatMAAMspJVgsDl8AIhckSg8XAHdvTwBcIQEiDT4OPhUqbyECAEoAS34Aej8Ybx83JgT/Xw8gHxZ/7w8RICxPHA9vBw+Pfw8PHwAPFv+fAsAvCc8vEr8ivwD/EQ8Bol8OEBa/A78hrwAPCU8vESNvvwWfHwNfAVoDHr+ZAAED34YaAdJPAK7PLwSEgDLHAGo1Pz8Pvx9fUwMrpb8O/58VTzAPIBoXIyQJNF8hpwIVAT8YGAUADDNBaX3RAMomJCg9EhUeA29MABsZBTMNJipjOhc19gcIDR8bBwQHEggCWi6DIgLuAQYA+BAFCha3A5XiAEsqM7UFFgFLhAMjFTMYE1Klnw74nRVBG/ASCm0BYRN/BrsU3VoWy+S0vV8LQx+vN8gF2AC2AK5EAWwApgYDKmAAroQ0NDQ0AT+OCg7wAAIHRAbpNgVcBV0APTA5BfbPFgMLzcYL/QqqA82eBALKCjQCjqYCht0/k2+OAsXQAoP3ASTKDgDw6ACKAUYCMpIKJpRaAE4A5womABzZvs0REEKiACIQAd5QdAECAj4Ywg/wGqY2AVgAYADYvAoCGAEubA0gvAY2ALAAbpbvqpyEAGAEpgQAJgAG7gAgAEACmghUFwCqAMpAINQIwC4DthRAAPcycKgApoIdABwBfCisABoATwBqASIAvhnSBP8aH/ECeAKXAq40NjgDBTwFYQU6AXs3oABgAD4XNgmcCY1eCl5tIFZeUqGgyoNHABgAEQAaABNwWQAmABMATPMa3T34ADldyprmM1M2XociUQgLzvwAXT3xABgAEQAaABNwIGFAnADD8AAgAD4BBJWzaCcIAIEBFMAWwKoAAdq9BWAF5wLQpALEtQAKUSGkahR4GnJM+gsAwCgeFAiUAECQ0BQuL8AAIAAAADKeIheclvFqQAAETr4iAMxIARMgAMIoHhQIAn0E0pDQFC4HhznoAAAAIAI2C0/4lvFqQAAETgBJJwYCAy4ABgYAFAA8MBKYEH4eRhTkAjYeFcgACAYAeABsOqyQ5gRwDayqugEgaIIAtgoACgDmEABmBAWGme5OBJJA2m4cDeoAmITWAXwrMgOgAGwBCh6CBXYF1Tzg1wKAAFdiuABRAFwAXQBsAG8AdgBrAHYAbwCEAHEwfxQBVE5TEQADVFhTBwBDANILAqcCzgLTApQCrQL6vAAMAL8APLhNBKkE6glGKTAU4Dr4N2EYEwBCkABKk8rHAbYBmwIoAiU4Ajf/Aq4CowCAANIChzgaNBsCsTgeODcFXrgClQKdAqQBiQGYAqsCsjTsNHsfNPA0ixsAWTWiOAMFPDQSNCk2BDZHNow2TTZUNhk28Jk9VzI3QkEoAoICoQKwAqcAQAAxBV4FXbS9BW47YkIXP1ciUqs05DS/FwABUwJW11e6nHuYZmSh/RAYA8oMKvZ8KASoUAJYWAJ6ILAsAZSoqjpgA0ocBIhmDgDWAAawRDQoAAcuAj5iAHABZiR2AIgiHgCaAU68ACxuHAG0ygM8MiZIAlgBdF4GagJqAPZOHAMuBgoATkYAsABiAHgAMLoGDPj0HpKEBAAOJgAuALggTAHWAeAMEDbd20Uege0ADwAWADkAQgA9OHd+2MUQZBBhBgNNDkxxPxUQArEPqwvqERoM1irQ090ANK4H8ANYB/ADWANYB/AH8ANYB/ADWANYA1gDWBwP8B/YxRBkD00EcgWTBZAE2wiIJk4RhgctCNdUEnQjHEwDSgEBIypJITuYMxAlR0wRTQgIATZHbKx9PQNMMbBU+pCnA9AyVDlxBgMedhKlAC8PeCE1uk6DekxxpQpQT7NX9wBFBgASqwAS5gBJDSgAUCwGPQBI4zTYABNGAE2bAE3KAExdGABKaAbgAFBXAFCOAFBJABI2SWdObALDOq0//QomCZhvwHdTBkIQHCemEPgMNAG2ATwN7kvZBPIGPATKH34ZGg/OlZ0Ipi3eDO4m5C6igFsj9iqEBe5L9TzeC05RaQ9aC2YJ5DpkgU8DIgEOIowK3g06CG4Q9ArKbA3mEUYHOgPWSZsApgcCCxIdNhW2JhFirQsKOXgG/Br3C5AmsBMqev0F1BoiBk4BKhsAANAu6IWxWjJcHU9gBgQLJiPIFKlQIQ0mQLh4SRocBxYlqgKSQ3FKiFE3HpQh9zw+DWcuFFF9B/Y8BhlQC4I8n0asRQ8R0z6OPUkiSkwtBDaALDAnjAnQD4YMunxzAVoJIgmyDHITMhEYN8YIOgcaLpclJxYIIkaWYJsE+KAD9BPSAwwFQAlCBxQDthwuEy8VKgUOgSXYAvQ21i60ApBWgQEYBcwPJh/gEFFH4Q7qCJwCZgOEJewALhUiABginAhEZABgj9lTBi7MCMhqbSN1A2gU6GIRdAeSDlgHqBw0FcAc4nDJXgyGCSiksAlcAXYJmgFgBOQICjVcjKEgQmdUi1kYnCBiQUBd/QIyDGYVoES+h3kCjA9sEhwBNgF0BzoNAgJ4Ee4RbBCWCOyGBTW2M/k6JgRQIYQgEgooA1BszwsoJvoM+WoBpBJjAw00PnfvZ6xgtyUX/gcaMsZBYSHyC5NPzgydGsIYQ1QvGeUHwAP0GvQn60FYBgADpAQUOk4z7wS+C2oIjAlAAEoOpBgH2BhrCnKM0QEyjAG4mgNYkoQCcJAGOAcMAGgMiAV65gAeAqgIpAAGANADWAA6Aq4HngAaAIZCAT4DKDABIuYCkAOUCDLMAZYwAfQqBBzEDBYA+DhuSwLDsgKAa2ajBd5ZAo8CSjYBTiYEBk9IUgOwcuIA3ABMBhTgSAEWrEvMG+REAeBwLADIAPwABjYHBkIBzgH0bgC4AWALMgmjtLYBTuoqAIQAFmwB2AKKAN4ANgCA8gFUAE4FWvoF1AJQSgESMhksWGIBvAMgATQBDgB6BsyOpsoIIARuB9QCEBwV4gLvLwe2AgMi4BPOQsYCvd9WADIXUu5eZwqoCqdeaAC0YTQHMnM9UQAPH6k+yAdy/BZIiQImSwBQ5gBQQzSaNTFWSTYBpwGqKQK38AFtqwBI/wK37gK3rQK3sAK6280C0gK33AK3zxAAUEIAUD9SklKDArekArw5AEQAzAHCO147WTteO1k7XjtZO147WTteO1kDmChYI03AVU0oJqkKbV9GYewMpw3VRMk6ShPcYFJgMxPJLbgUwhXPJVcZPhq9JwYl5VUKDwUt1GYxCC00dhe9AEApaYNCY4ceMQpMHOhTklT5LRwAskujM7ANrRsWREEFSHXuYisWDwojAmSCAmJDXE6wXDchAqH4AmiZAmYKAp+FOBwMAmY8AmYnBG8EgAN/FAN+kzkHOXgYOYM6JCQCbB4CMjc4CwJtyAJtr/CLADRoRiwBaADfAOIASwYHmQyOAP8MwwAOtgJ3MAJ2o0ACeUxEAni7Hl3cRa9G9AJ8QAJ6yQJ9CgJ88UgBSH5kJQAsFklZSlwWGErNAtECAtDNSygDiFADh+dExpEzAvKiXQQDA69Lz0wuJgTQTU1NsAKLQAKK2cIcCB5EaAa4Ao44Ao5dQZiCAo7aAo5deVG1UzYLUtVUhgKT/AKTDQDqAB1VH1WwVdEHLBwplocy4nhnRTw6ApegAu+zWCKpAFomApaQApZ9nQCqWa1aCoJOADwClrYClk9cRVzSApnMApllXMtdCBoCnJw5wzqeApwXAp+cAp65iwAeEDIrEAKd8gKekwC2PmE1YfACntQCoG8BqgKeoCACnk+mY8lkKCYsAiewAiZ/AqD8AqBN2AKmMAKlzwKoAAB+AqfzaH1osgAESmodatICrOQCrK8CrWgCrQMCVx4CVd0CseLYAx9PbJgCsr4OArLpGGzhbWRtSWADJc4Ctl08QG6RAylGArhfArlIFgK5K3hwN3DiAr0aAy2zAzISAr6JcgMDM3ICvhtzI3NQAsPMAsMFc4N0TDZGdOEDPKgDPJsDPcACxX0CxkgCxhGKAshqUgLIRQLJUALJLwJkngLd03h6YniveSZL0QMYpGcDAmH1GfSVJXsMXpNevBICz2wCz20wTFTT9BSgAMeuAs90ASrrA04TfkwGAtwoAtuLAtJQA1JdA1NgAQIDVY2AikABzBfuYUZ2AILPg44C2sgC2d+EEYRKpz0DhqYAMANkD4ZyWvoAVgLfZgLeuXR4AuIw7RUB8zEoAfScAfLTiALr9ALpcXoAAur6AurlAPpIAboC7ooC652Wq5cEAu5AA4XhmHpw4XGiAvMEAGoDjheZlAL3FAORbwOSiAL3mQL52gL4Z5odmqy8OJsfA52EAv77ARwAOp8dn7QDBY4DpmsDptoA0sYDBmuhiaIGCgMMSgFgASACtgNGAJwEgLpoBgC8BGzAEowcggCEDC6kdjoAJAM0C5IKRoABZCgiAIzw3AYBLACkfng9ogigkgNmWAN6AEQCvrkEVqTGAwCsBRbAA+4iQkMCHR072jI2PTbUNsk2RjY5NvA23TZKNiU3EDcZN5I+RTxDRTBCJkK5VBYKFhZfwQCWygU3AJBRHpu+OytgNxa61A40GMsYjsn7BVwFXQVcBV0FaAVdBVwFXQVcBV0FXAVdBVwFXUsaCNyKAK4AAQUHBwKU7oICoW1e7jAEzgPxA+YDwgCkBFDAwADABKzAAOxFLhitA1UFTDeyPkM+bj51QkRCuwTQWWQ8X+0AWBYzsACNA8xwzAGm7EZ/QisoCTAbLDs6fnLfb8H2GccsbgFw13M1HAVkBW/Jxsm9CNRO8E8FDD0FBQw9FkcClOYCoMFegpDfADgcMiA2AJQACB8AsigKAIzIEAJKeBIApY5yPZQIAKQiHb4fvj5BKSRPQrZCOz0oXyxgOywfKAnGbgMClQaCAkILXgdeCD9IIGUgQj5fPoY+dT52Ao5CM0dAX9BTVG9SDzFwWTQAbxBzJF/lOEIQQglCCkKJIAls5AcClQICoKPMODEFxhi6KSAbiyfIRrMjtCgdWCAkPlFBIitCsEJRzAbMAV/OEyQzDg0OAQQEJ36i328/Mk9AybDJsQlq3tDRApUKAkFzXf1d/j9uALYP6hCoFgCTGD8kPsFKQiobrm0+zj0KSD8kPnVCRBwMDyJRTHFgMTJa5rwXQiQ2YfI/JD7BMEJEHGINTw4TOFlIRzwJO0icMQpyPyQ+wzJCRBv6DVgnKB01NgUKj2bwYzMqCoBkznBgEF+zYDIocwRIX+NgHj4HICNfh2C4CwdwFWpTG/lgUhYGAwRfv2Ts8mAaXzVgml/XYIJfuWC4HI1gUF9pYJZgMR6ilQHMAOwLAlDRefC0in4AXAEJA6PjCwc0IamOANMMCAECRQDFNRTZBgd+CwQlRA+r6+gLBDEFBnwUBXgKATIArwAGRAAHA3cDdAN2A3kDdwN9A3oDdQN7A30DfAN4A3oDfQAYEAAlAtYASwMAUAFsAHcKAHcAmgB3AHUAdQB2AHVu8UgAygDAAHcAdQB1AHYAdQALCgB3AAsAmgB3AAsCOwB3AAtu8UgAygDAAHgKAJoAdwB3AHUAdQB2AHUAeAB1AHUAdgB1bvFIAMoAwAALCgCaAHcACwB3AAsCOwB3AAtu8UgAygDAAH4ACwGgALcBpwC6AahdAu0COwLtbvFIAMoAwAALCgCaAu0ACwLtAAsCOwLtAAtu8UgAygDAA24ACwNvAAu0VsQAAzsAABCkjUIpAAsAUIusOggWcgMeBxVsGwL67U/2HlzmWOEeOgALASvuAAseAfpKUpnpGgYJDCIZM6YyARUE9ThqAD5iXQgnAJYJPnOzw0ZAEZxEKsIAkA4DhAHnTAIDxxUDK0lxCQlPYgIvIQVYJQBVqE1GakUAKGYiDToSBA1EtAYAXQJYAIF8GgMHRyAAIAjOe9YncekRAA0KACUrjwE7Ayc6AAYWAqaiKG4McEcqANoN3+Mg9TwCBhIkuCny+JwUQ29L008JluRxu3K+oAdqiHOqFH0AG5SUIfUJ5SxCGfxdipRzqTmT4V5Zb+r1Uo4Vm+NqSSEl2mNvR2JhIa8SpYO6ntdwFXHCWTCK8f2+Hxo7uiG3drDycAuKIMP5bhi06ACnqArH1rz4Rqg//lm6SgJGEVbF9xJHISaR6HxqxSnkw6shDnelHKNEfGUXSJRJ1GcsmtJw25xrZMDK9gXSm1/YMkdX4/6NKYOdtk/NQ3/NnDASjTc3fPjIjW/5sVfVObX2oTDWkr1dF9f3kxBsD3/3aQO8hPfRz+e0uEiJqt1161griu7gz8hDDwtpy+F+BWtefnKHZPAxcZoWbnznhJpy0e842j36bcNzGnIEusgGX0a8ZxsnjcSsPDZ09yZ36fCQbriHeQ72JRMILNl6ePPf2HWoVwgWAm1fb3V2sAY0+B6rAXqSwPBgseVmoqsBTSrm91+XasMYYySI8eeRxH3ZvHkMz3BQ5aJ3iUVbYPNM3/7emRtjlsMgv/9VyTsyt/mK+8fgWeT6SoFaclXqn42dAIsvAarF5vNNWHzKSkKQ/8Hfk5ZWK7r9yliOsooyBjRhfkHP4Q2DkWXQi6FG/9r/IwbmkV5T7JSopHKn1pJwm9tb5Ot0oyN1Z2mPpKXHTxx2nlK08fKk1hEYA8WgVVWL5lgx0iTv+KdojJeU23ZDjmiubXOxVXJKKi2Wjuh2HLZOFLiSC7Tls5SMh4f+Pj6xUSrNjFqLGehRNB8lC0QSLNmkJJx/wSG3MnjE9T1CkPwJI0wH2lfzwETIiVqUxg0dfu5q39Gt+hwdcxkhhNvQ4TyrBceof3Mhs/IxFci1HmHr4FMZgXEEczPiGCx0HRwzAqDq2j9AVm1kwN0mRVLWLylgtoPNapF5cY4Y1wJh/e0BBwZj44YgZrDNqvD/9Hv7GFYdUQeDJuQ3EWI4HaKqavU1XjC/n41kT4L79kqGq0kLhdTZvgP3TA3fS0ozVz+5piZsoOtIvBUFoMKbNcmBL6YxxaUAusHB38XrS8dQMnQwJfUUkpRoGr5AUeWicvBTzyK9g77+yCkf5PAysL7r/JjcZgrbvRpMW9iyaxZvKO6ceZN2EwIxKwVFPuvFuiEPGCoagbMo+SpydLrXqBzNCDGFCrO/rkcwa2xhokQZ5CdZ0AsU3JfSqJ6n5I14YA+P/uAgfhPU84Tlw7cEFfp7AEE8ey4sP12PTt4Cods1GRgDOB5xvyiR5m+Bx8O5nBCNctU8BevfV5A08x6RHd5jcwPTMDSZJOedIZ1cGQ704lxbAzqZOP05ZxaOghzSdvFBHYqomATARyAADK4elP8Ly3IrUZKfWh23Xy20uBUmLS4Pfagu9+oyVa2iPgqRP3F2CTUsvJ7+RYnN8fFZbU/HVvxvcFFDKkiTqV5UBZ3Gz54JAKByi9hkKMZJvuGgcSYXFmw08UyoQyVdfTD1/dMkCHXcTGAKeROgArsvmRrQTLUOXioOHGK2QkjHuoYFgXciZoTJd6Fs5q1QX1G+p/e26hYsEf7QZD1nnIyl/SFkNtYYmmBhpBrxl9WbY0YpHWRuw2Ll/tj9mD8P4snVzJl4F9J+1arVeTb9E5r2ILH04qStjxQNwn3m4YNqxmaNbLAqW2TN6LidwuJRqS+NXbtqxoeDXpxeGWmxzSkWxjkyCkX4NQRme6q5SAcC+M7+9ETfA/EwrzQajKakCwYyeunP6ZFlxU2oMEn1Pz31zeStW74G406ZJFCl1wAXIoUKkWotYEpOuXB1uVNxJ63dpJEqfxBeptwIHNrPz8BllZoIcBoXwgfJ+8VAUnVPvRvexnw0Ma/WiGYuJO5y8QTvEYBigFmhUxY5RqzE8OcywN/8m4UYrlaniJO75XQ6KSo9+tWHlu+hMi0UVdiKQp7NelnoZUzNaIyBPVeOwK6GNp+FfHuPOoyhaWuNvTYFkvxscMQWDh+zeFCFkgwbXftiV23ywJ4+uwRqmg9k3KzwIQpzppt8DBBOMbrqwQM5Gb05sEwdKzMiAqOloaA/lr0KA+1pr0/+HiWoiIjHA/wir2nIuS3PeU/ji3O6ZwoxcR1SZ9FhtLC5S0FIzFhbBWcGVP/KpxOPSiUoAdWUpqKH++6Scz507iCcxYI6rdMBICPJZea7OcmeFw5mObJSiqpjg2UoWNIs+cFhyDSt6geV5qgi3FunmwwDoGSMgerFOZGX1m0dMCYo5XOruxO063dwENK9DbnVM9wYFREzh4vyU1WYYJ/LRRp6oxgjqP/X5a8/4Af6p6NWkQferzBmXme0zY/4nwMJm/wd1tIqSwGz+E3xPEAOoZlJit3XddD7/BT1pllzOx+8bmQtANQ/S6fZexc6qi3W+Q2xcmXTUhuS5mpHQRvcxZUN0S5+PL9lXWUAaRZhEH8hTdAcuNMMCuVNKTEGtSUKNi3O6KhSaTzck8csZ2vWRZ+d7mW8c4IKwXIYd25S/zIftPkwPzufjEvOHWVD1m+FjpDVUTV0DGDuHj6QnaEwLu/dEgdLQOg9E1Sro9XHJ8ykLAwtPu+pxqKDuFexqON1sKQm7rwbE1E68UCfA/erovrTCG+DBSNg0l4goDQvZN6uNlbyLpcZAwj2UclycvLpIZMgv4yRlpb3YuMftozorbcGVHt/VeDV3+Fdf1TP0iuaCsPi2G4XeGhsyF1ubVDxkoJhmniQ0/jSg/eYML9KLfnCFgISWkp91eauR3IQvED0nAPXK+6hPCYs+n3+hCZbiskmVMG2da+0EsZPonUeIY8EbfusQXjsK/eFDaosbPjEfQS0RKG7yj5GG69M7MeO1HmiUYocgygJHL6M1qzUDDwUSmr99V7Sdr2F3JjQAJY+F0yH33Iv3+C9M38eML7gTgmNu/r2bUMiPvpYbZ6v1/IaESirBHNa7mPKn4dEmYg7v/+HQgPN1G79jBQ1+soydfDC2r+h2Bl/KIc5KjMK7OH6nb1jLsNf0EHVe2KBiE51ox636uyG6Lho0t3J34L5QY/ilE3mikaF4HKXG1mG1rCevT1Vv6GavltxoQe/bMrpZvRggnBxSEPEeEzkEdOxTnPXHVjUYdw8JYvjB/o7Eegc3Ma+NUxLLnsK0kJlinPmUHzHGtrk5+CAbVzFOBqpyy3QVUnzTDfC/0XD94/okH+OB+i7g9lolhWIjSnfIb+Eq43ZXOWmwvjyV/qqD+t0e+7mTEM74qP/Ozt8nmC7mRpyu63OB4KnUzFc074SqoyPUAgM+/TJGFo6T44EHnQU4X4z6qannVqgw/U7zCpwcmXV1AubIrvOmkKHazJAR55ePjp5tLBsN8vAqs3NAHdcEHOR2xQ0lsNAFzSUuxFQCFYvXLZJdOj9p4fNq6p0HBGUik2YzaI4xySy91KzhQ0+q1hjxvImRwPRf76tChlRkhRCi74NXZ9qUNeIwP+s5p+3m5nwPdNOHgSLD79n7O9m1n1uDHiMntq4nkYwV5OZ1ENbXxFd4PgrlvavZsyUO4MqYlqqn1O8W/I1dEZq5dXhrbETLaZIbC2Kj/Aa/QM+fqUOHdf0tXAQ1huZ3cmWECWSXy/43j35+Mvq9xws7JKseriZ1pEWKc8qlzNrGPUGcVgOa9cPJYIJsGnJTAUsEcDOEVULO5x0rXBijc1lgXEzQQKhROf8zIV82w8eswc78YX11KYLWQRcgHNJElBxfXr72lS2RBSl07qTKorO2uUDZr3sFhYsvnhLZn0A94KRzJ/7DEGIAhW5ZWFpL8gEwu1aLA9MuWZzNwl8Oze9Y+bX+v9gywRVnoB5I/8kXTXU3141yRLYrIOOz6SOnyHNy4SieqzkBXharjfjqq1q6tklaEbA8Qfm2DaIPs7OTq/nvJBjKfO2H9bH2cCMh1+5gspfycu8f/cuuRmtDjyqZ7uCIMyjdV3a+p3fqmXsRx4C8lujezIFHnQiVTXLXuI1XrwN3+siYYj2HHTvESUx8DlOTXpak9qFRK+L3mgJ1WsD7F4cu1aJoFoYQnu+wGDMOjJM3kiBQWHCcvhJ/HRdxodOQp45YZaOTA22Nb4XKCVxqkbwMYFhzYQYIAnCW8FW14uf98jhUG2zrKhQQ0q0CEq0t5nXyvUyvR8DvD69LU+g3i+HFWQMQ8PqZuHD+sNKAV0+M6EJC0szq7rEr7B5bQ8BcNHzvDMc9eqB5ZCQdTf80Obn4uzjwpYU7SISdtV0QGa9D3Wrh2BDQtpBKxaNFV+/Cy2P/Sv+8s7Ud0Fd74X4+o/TNztWgETUapy+majNQ68Lq3ee0ZO48VEbTZYiH1Co4OlfWef82RWeyUXo7woM03PyapGfikTnQinoNq5z5veLpeMV3HCAMTaZmA1oGLAn7XS3XYsz+XK7VMQsc4XKrmDXOLU/pSXVNUq8dIqTba///3x6LiLS6xs1xuCAYSfcQ3+rQgmu7uvf3THKt5Ooo97TqcbRqxx7EASizaQCBQllG/rYxVapMLgtLbZS64w1MDBMXX+PQpBKNwqUKOf2DDRDUXQf9EhOS0Qj4nTmlA8dzSLz/G1d+Ud8MTy/6ghhdiLpeerGY/UlDOfiuqFsMUU5/UYlP+BAmgRLuNpvrUaLlVkrqDievNVEAwF+4CoM1MZTmjxjJMsKJq+u8Zd7tNCUFy6LiyYXRJQ4VyvEQFFaCGKsxIwQkk7EzZ6LTJq2hUuPhvAW+gQnSG6J+MszC+7QCRHcnqDdyNRJ6T9xyS87A6MDutbzKGvGktpbXqtzWtXb9HsfK2cBMomjN9a4y+TaJLnXxAeX/HWzmf4cR4vALt/P4w4qgKY04ml4ZdLOinFYS6cup3G/1ie4+t1eOnpBNlqGqs75ilzkT4+DsZQxNvaSKJ//6zIbbk/M7LOhFmRc/1R+kBtz7JFGdZm/COotIdvQoXpTqP/1uqEUmCb/QWoGLMwO5ANcHzxdY48IGP5+J+zKOTBFZ4Pid+GTM+Wq12MV/H86xEJptBa6T+p3kgpwLedManBHC2GgNrFpoN2xnrMz9WFWX/8/ygSBkavq2Uv7FdCsLEYLu9LLIvAU0bNRDtzYl+/vXmjpIvuJFYjmI0im6QEYqnIeMsNjXG4vIutIGHijeAG/9EDBozKV5cldkHbLxHh25vT+ZEzbhXlqvpzKJwcEgfNwLAKFeo0/pvEE10XDB+EXRTXtSzJozQKFFAJhMxYkVaCW+E9AL7tMeU8acxidHqzb6lX4691UsDpy/LLRmT+epgW56+5Cw8tB4kMUv6s9lh3eRKbyGs+H/4mQMaYzPTf2OOdokEn+zzgvoD3FqNKk8QqGAXVsqcGdXrT62fSPkR2vROFi68A6se86UxRUk4cajfPyCC4G5wDhD+zNq4jodQ4u4n/m37Lr36n4LIAAsVr02dFi9AiwA81MYs2rm4eDlDNmdMRvEKRHfBwW5DdMNp0jPFZMeARqF/wL4XBfd+EMLBfMzpH5GH6NaW+1vrvMdg+VxDzatk3MXgO3ro3P/DpcC6+Mo4MySJhKJhSR01SGGGp5hPWmrrUgrv3lDnP+HhcI3nt3YqBoVAVTBAQT5iuhTg8nvPtd8ZeYj6w1x6RqGUBrSku7+N1+BaasZvjTk64RoIDlL8brpEcJx3OmY7jLoZsswdtmhfC/G21llXhITOwmvRDDeTTPbyASOa16cF5/A1fZAidJpqju3wYAy9avPR1ya6eNp9K8XYrrtuxlqi+bDKwlfrYdR0RRiKRVTLOH85+ZY7XSmzRpfZBJjaTa81VDcJHpZnZnSQLASGYW9l51ZV/h7eVzTi3Hv6hUsgc/51AqJRTkpbFVLXXszoBL8nBX0u/0jBLT8nH+fJePbrwURT58OY+UieRjd1vs04w0VG5VN2U6MoGZkQzKN/ptz0Q366dxoTGmj7i1NQGHi9GgnquXFYdrCfZBmeb7s0T6yrdlZH5cZuwHFyIJ/kAtGsTg0xH5taAAq44BAk1CPk9KVVbqQzrCUiFdF/6gtlPQ8bHHc1G1W92MXGZ5HEHftyLYs8mbD/9xYRUWkHmlM0zC2ilJlnNgV4bfALpQghxOUoZL7VTqtCHIaQSXm+YUMnpkXybnV+A6xlm2CVy8fn0Xlm2XRa0+zzOa21JWWmixfiPMSCZ7qA4rS93VN3pkpF1s5TonQjisHf7iU9ZGvUPOAKZcR1pbeVf/Ul7OhepGCaId9wOtqo7pJ7yLcBZ0pFkOF28y4zEI/kcUNmutBHaQpBdNM8vjCS6HZRokkeo88TBAjGyG7SR+6vUgTcyK9Imalj0kuxz0wmK+byQU11AiJFk/ya5dNduRClcnU64yGu/ieWSeOos1t3ep+RPIWQ2pyTYVbZltTbsb7NiwSi3AV+8KLWk7LxCnfZUetEM8ThnsSoGH38/nyAwFguJp8FjvlHtcWZuU4hPva0rHfr0UhOOJ/F6vS62FW7KzkmRll2HEc7oUq4fyi5T70Vl7YVIfsPHUCdHesf9Lk7WNVWO75JDkYbMI8TOW8JKVtLY9d6UJRITO8oKo0xS+o99Yy04iniGHAaGj88kEWgwv0OrHdY/nr76DOGNS59hXCGXzTKUvDl9iKpLSWYN1lxIeyywdNpTkhay74w2jFT6NS8qkjo5CxA1yfSYwp6AJIZNKIeEK5PJAW7ORgWgwp0VgzYpqovMrWxbu+DGZ6Lhie1RAqpzm8VUzKJOH3mCzWuTOLsN3VT/dv2eeYe9UjbR8YTBsLz7q60VN1sU51k+um1f8JxD5pPhbhSC8rRaB454tmh6YUWrJI3+GWY0qeWioj/tbkYITOkJaeuGt4JrJvHA+l0Gu7kY7XOaa05alMnRWVCXqFgLIwSY4uF59Ue5SU4QKuc/HamDxbr0x6csCetXGoP7Qn1Bk/J9DsynO/UD6iZ1Hyrz+jit0hDCwi/E9OjgKTbB3ZQKQ/0ZOvevfNHG0NK4Aj3Cp7NpRk07RT1i/S0EL93Ag8GRgKI9CfpajKyK6+Jj/PI1KO5/85VAwz2AwzP8FTBb075IxCXv6T9RVvWT2tUaqxDS92zrGUbWzUYk9mSs82pECH+fkqsDt93VW++4YsR/dHCYcQSYTO/KaBMDj9LSD/J/+z20Kq8XvZUAIHtm9hRPP3ItbuAu2Hm5lkPs92pd7kCxgRs0xOVBnZ13ccdA0aunrwv9SdqElJRC3g+oCu+nXyCgmXUs9yMjTMAIHfxZV+aPKcZeUBWt057Xo85Ks1Ir5gzEHCWqZEhrLZMuF11ziGtFQUds/EESajhagzcKsxamcSZxGth4UII+adPhQkUnx2WyN+4YWR+r3f8MnkyGFuR4zjzxJS8WsQYR5PTyRaD9ixa6Mh741nBHbzfjXHskGDq179xaRNrCIB1z1xRfWfjqw2pHc1zk9xlPpL8sQWAIuETZZhbnmL54rceXVNRvUiKrrqIkeogsl0XXb17ylNb0f4GA9Wd44vffEG8FSZGHEL2fbaTGRcSiCeA8PmA/f6Hz8HCS76fXUHwgwkzSwlI71ekZ7Fapmlk/KC+Hs8hUcw3N2LN5LhkVYyizYFl/uPeVP5lsoJHhhfWvvSWruCUW1ZcJOeuTbrDgywJ/qG07gZJplnTvLcYdNaH0KMYOYMGX+rB4NGPFmQsNaIwlWrfCezxre8zXBrsMT+edVLbLqN1BqB76JH4BvZTqUIMfGwPGEn+EnmTV86fPBaYbFL3DFEhjB45CewkXEAtJxk4/Ms2pPXnaRqdky0HOYdcUcE2zcXq4vaIvW2/v0nHFJH2XXe22ueDmq/18XGtELSq85j9X8q0tcNSSKJIX8FTuJF/Pf8j5PhqG2u+osvsLxYrvvfeVJL+4tkcXcr9JV7v0ERmj/X6fM3NC4j6dS1+9Umr2oPavqiAydTZPLMNRGY23LO9zAVDly7jD+70G5TPPLdhRIl4WxcYjLnM+SNcJ26FOrkrISUtPObIz5Zb3AG612krnpy15RMW+1cQjlnWFI6538qky9axd2oJmHIHP08KyP0ubGO+TQNOYuv2uh17yCIvR8VcStw7o1g0NM60sk+8Tq7YfIBJrtp53GkvzXH7OA0p8/n/u1satf/VJhtR1l8Wa6Gmaug7haSpaCaYQax6ta0mkutlb+eAOSG1aobM81D9A4iS1RRlzBBoVX6tU1S6WE2N9ORY6DfeLRC4l9Rvr5h95XDWB2mR1d4WFudpsgVYwiTwT31ljskD8ZyDOlm5DkGh9N/UB/0AI5Xvb8ZBmai2hQ4BWMqFwYnzxwB26YHSOv9WgY3JXnvoN+2R4rqGVh/LLDMtpFP+SpMGJNWvbIl5SOodbCczW2RKleksPoUeGEzrjtKHVdtZA+kfqO+rVx/iclCqwoopepvJpSTDjT+b9GWylGRF8EDbGlw6eUzmJM95Ovoz+kwLX3c2fTjFeYEsE7vUZm3mqdGJuKh2w9/QGSaqRHs99aScGOdDqkFcACoqdbBoQqqjamhH6Q9ng39JCg3lrGJwd50Qk9ovnqBTr8MME7Ps2wiVfygUmPoUBJJfJWX5Nda0nuncbFkA=="));
}
var init_include = __esm({
  "../../node_modules/@ethersproject/hash/lib.esm/ens-normalize/include.js"() {
    "use strict";
    init_lib10();
    init_decoder();
  }
});

// ../../node_modules/@ethersproject/hash/lib.esm/ens-normalize/lib.js
function explode_cp(name) {
  return toUtf8CodePoints(name);
}
function filter_fe0f(cps) {
  return cps.filter((cp) => cp != 65039);
}
function ens_normalize_post_check(name) {
  for (let label of name.split(".")) {
    let cps = explode_cp(label);
    try {
      for (let i = cps.lastIndexOf(UNDERSCORE) - 1; i >= 0; i--) {
        if (cps[i] !== UNDERSCORE) {
          throw new Error(`underscore only allowed at start`);
        }
      }
      if (cps.length >= 4 && cps.every((cp) => cp < 128) && cps[2] === HYPHEN && cps[3] === HYPHEN) {
        throw new Error(`invalid label extension`);
      }
    } catch (err) {
      throw new Error(`Invalid label "${label}": ${err.message}`);
    }
  }
  return name;
}
function ens_normalize(name) {
  return ens_normalize_post_check(normalize(name, filter_fe0f));
}
function normalize(name, emoji_filter) {
  let input = explode_cp(name).reverse();
  let output = [];
  while (input.length) {
    let emoji = consume_emoji_reversed(input);
    if (emoji) {
      output.push(...emoji_filter(emoji));
      continue;
    }
    let cp = input.pop();
    if (VALID.has(cp)) {
      output.push(cp);
      continue;
    }
    if (IGNORED.has(cp)) {
      continue;
    }
    let cps = MAPPED[cp];
    if (cps) {
      output.push(...cps);
      continue;
    }
    throw new Error(`Disallowed codepoint: 0x${cp.toString(16).toUpperCase()}`);
  }
  return ens_normalize_post_check(nfc(String.fromCodePoint(...output)));
}
function nfc(s) {
  return s.normalize("NFC");
}
function consume_emoji_reversed(cps, eaten) {
  var _a;
  let node = EMOJI_ROOT;
  let emoji;
  let saved;
  let stack = [];
  let pos = cps.length;
  if (eaten)
    eaten.length = 0;
  while (pos) {
    let cp = cps[--pos];
    node = (_a = node.branches.find((x) => x.set.has(cp))) === null || _a === void 0 ? void 0 : _a.node;
    if (!node)
      break;
    if (node.save) {
      saved = cp;
    } else if (node.check) {
      if (cp === saved)
        break;
    }
    stack.push(cp);
    if (node.fe0f) {
      stack.push(65039);
      if (pos > 0 && cps[pos - 1] == 65039)
        pos--;
    }
    if (node.valid) {
      emoji = stack.slice();
      if (node.valid == 2)
        emoji.splice(1, 1);
      if (eaten)
        eaten.push(...cps.slice(pos).reverse());
      cps.length = pos;
    }
  }
  return emoji;
}
var r, VALID, IGNORED, MAPPED, EMOJI_ROOT, HYPHEN, UNDERSCORE;
var init_lib11 = __esm({
  "../../node_modules/@ethersproject/hash/lib.esm/ens-normalize/lib.js"() {
    "use strict";
    init_lib9();
    init_include();
    init_decoder();
    r = getData();
    VALID = new Set(read_member_array(r));
    IGNORED = new Set(read_member_array(r));
    MAPPED = read_mapped_map(r);
    EMOJI_ROOT = read_emoji_trie(r);
    HYPHEN = 45;
    UNDERSCORE = 95;
  }
});

// ../../node_modules/@ethersproject/hash/lib.esm/namehash.js
function checkComponent(comp) {
  if (comp.length === 0) {
    throw new Error("invalid ENS name; empty component");
  }
  return comp;
}
function ensNameSplit(name) {
  const bytes = toUtf8Bytes(ens_normalize(name));
  const comps = [];
  if (name.length === 0) {
    return comps;
  }
  let last = 0;
  for (let i = 0; i < bytes.length; i++) {
    const d = bytes[i];
    if (d === 46) {
      comps.push(checkComponent(bytes.slice(last, i)));
      last = i + 1;
    }
  }
  if (last >= bytes.length) {
    throw new Error("invalid ENS name; empty component");
  }
  comps.push(checkComponent(bytes.slice(last)));
  return comps;
}
function ensNormalize(name) {
  return ensNameSplit(name).map((comp) => toUtf8String(comp)).join(".");
}
function isValidName(name) {
  try {
    return ensNameSplit(name).length !== 0;
  } catch (error) {
  }
  return false;
}
function namehash(name) {
  if (typeof name !== "string") {
    logger12.throwArgumentError("invalid ENS name; not a string", "name", name);
  }
  let result = Zeros;
  const comps = ensNameSplit(name);
  while (comps.length) {
    result = keccak256(concat([result, keccak256(comps.pop())]));
  }
  return hexlify(result);
}
function dnsEncode(name) {
  return hexlify(concat(ensNameSplit(name).map((comp) => {
    if (comp.length > 63) {
      throw new Error("invalid DNS encoded entry; length exceeds 63 bytes");
    }
    const bytes = new Uint8Array(comp.length + 1);
    bytes.set(comp, 1);
    bytes[0] = bytes.length - 1;
    return bytes;
  }))) + "00";
}
var logger12, Zeros;
var init_namehash = __esm({
  "../../node_modules/@ethersproject/hash/lib.esm/namehash.js"() {
    "use strict";
    init_lib2();
    init_lib9();
    init_lib5();
    init_lib();
    init_version9();
    init_lib11();
    logger12 = new Logger(version9);
    Zeros = new Uint8Array(32);
    Zeros.fill(0);
  }
});

// ../../node_modules/@ethersproject/hash/lib.esm/message.js
function hashMessage(message) {
  if (typeof message === "string") {
    message = toUtf8Bytes(message);
  }
  return keccak256(concat([
    toUtf8Bytes(messagePrefix),
    toUtf8Bytes(String(message.length)),
    message
  ]));
}
var messagePrefix;
var init_message = __esm({
  "../../node_modules/@ethersproject/hash/lib.esm/message.js"() {
    "use strict";
    init_lib2();
    init_lib5();
    init_lib9();
    messagePrefix = "Ethereum Signed Message:\n";
  }
});

// ../../node_modules/@ethersproject/hash/lib.esm/typed-data.js
function hexPadRight(value) {
  const bytes = arrayify(value);
  const padOffset = bytes.length % 32;
  if (padOffset) {
    return hexConcat([bytes, padding.slice(padOffset)]);
  }
  return hexlify(bytes);
}
function checkString(key2) {
  return function(value) {
    if (typeof value !== "string") {
      logger13.throwArgumentError(`invalid domain value for ${JSON.stringify(key2)}`, `domain.${key2}`, value);
    }
    return value;
  };
}
function getBaseEncoder(type) {
  {
    const match = type.match(/^(u?)int(\d*)$/);
    if (match) {
      const signed2 = match[1] === "";
      const width = parseInt(match[2] || "256");
      if (width % 8 !== 0 || width > 256 || match[2] && match[2] !== String(width)) {
        logger13.throwArgumentError("invalid numeric width", "type", type);
      }
      const boundsUpper = MaxUint2562.mask(signed2 ? width - 1 : width);
      const boundsLower = signed2 ? boundsUpper.add(One2).mul(NegativeOne3) : Zero3;
      return function(value) {
        const v = BigNumber.from(value);
        if (v.lt(boundsLower) || v.gt(boundsUpper)) {
          logger13.throwArgumentError(`value out-of-bounds for ${type}`, "value", value);
        }
        return hexZeroPad(v.toTwos(256).toHexString(), 32);
      };
    }
  }
  {
    const match = type.match(/^bytes(\d+)$/);
    if (match) {
      const width = parseInt(match[1]);
      if (width === 0 || width > 32 || match[1] !== String(width)) {
        logger13.throwArgumentError("invalid bytes width", "type", type);
      }
      return function(value) {
        const bytes = arrayify(value);
        if (bytes.length !== width) {
          logger13.throwArgumentError(`invalid length for ${type}`, "value", value);
        }
        return hexPadRight(value);
      };
    }
  }
  switch (type) {
    case "address":
      return function(value) {
        return hexZeroPad(getAddress(value), 32);
      };
    case "bool":
      return function(value) {
        return !value ? hexFalse : hexTrue;
      };
    case "bytes":
      return function(value) {
        return keccak256(value);
      };
    case "string":
      return function(value) {
        return id(value);
      };
  }
  return null;
}
function encodeType(name, fields) {
  return `${name}(${fields.map(({ name: name2, type }) => type + " " + name2).join(",")})`;
}
var __awaiter2, logger13, padding, NegativeOne3, Zero3, One2, MaxUint2562, hexTrue, hexFalse, domainFieldTypes, domainFieldNames, domainChecks, TypedDataEncoder;
var init_typed_data = __esm({
  "../../node_modules/@ethersproject/hash/lib.esm/typed-data.js"() {
    "use strict";
    init_lib7();
    init_lib3();
    init_lib2();
    init_lib5();
    init_lib4();
    init_lib();
    init_version9();
    init_id();
    __awaiter2 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    logger13 = new Logger(version9);
    padding = new Uint8Array(32);
    padding.fill(0);
    NegativeOne3 = BigNumber.from(-1);
    Zero3 = BigNumber.from(0);
    One2 = BigNumber.from(1);
    MaxUint2562 = BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    hexTrue = hexZeroPad(One2.toHexString(), 32);
    hexFalse = hexZeroPad(Zero3.toHexString(), 32);
    domainFieldTypes = {
      name: "string",
      version: "string",
      chainId: "uint256",
      verifyingContract: "address",
      salt: "bytes32"
    };
    domainFieldNames = [
      "name",
      "version",
      "chainId",
      "verifyingContract",
      "salt"
    ];
    domainChecks = {
      name: checkString("name"),
      version: checkString("version"),
      chainId: function(value) {
        try {
          return BigNumber.from(value).toString();
        } catch (error) {
        }
        return logger13.throwArgumentError(`invalid domain value for "chainId"`, "domain.chainId", value);
      },
      verifyingContract: function(value) {
        try {
          return getAddress(value).toLowerCase();
        } catch (error) {
        }
        return logger13.throwArgumentError(`invalid domain value "verifyingContract"`, "domain.verifyingContract", value);
      },
      salt: function(value) {
        try {
          const bytes = arrayify(value);
          if (bytes.length !== 32) {
            throw new Error("bad length");
          }
          return hexlify(bytes);
        } catch (error) {
        }
        return logger13.throwArgumentError(`invalid domain value "salt"`, "domain.salt", value);
      }
    };
    TypedDataEncoder = class _TypedDataEncoder {
      constructor(types) {
        defineReadOnly(this, "types", Object.freeze(deepCopy(types)));
        defineReadOnly(this, "_encoderCache", {});
        defineReadOnly(this, "_types", {});
        const links = {};
        const parents = {};
        const subtypes = {};
        Object.keys(types).forEach((type) => {
          links[type] = {};
          parents[type] = [];
          subtypes[type] = {};
        });
        for (const name in types) {
          const uniqueNames = {};
          types[name].forEach((field) => {
            if (uniqueNames[field.name]) {
              logger13.throwArgumentError(`duplicate variable name ${JSON.stringify(field.name)} in ${JSON.stringify(name)}`, "types", types);
            }
            uniqueNames[field.name] = true;
            const baseType = field.type.match(/^([^\x5b]*)(\x5b|$)/)[1];
            if (baseType === name) {
              logger13.throwArgumentError(`circular type reference to ${JSON.stringify(baseType)}`, "types", types);
            }
            const encoder = getBaseEncoder(baseType);
            if (encoder) {
              return;
            }
            if (!parents[baseType]) {
              logger13.throwArgumentError(`unknown type ${JSON.stringify(baseType)}`, "types", types);
            }
            parents[baseType].push(name);
            links[name][baseType] = true;
          });
        }
        const primaryTypes = Object.keys(parents).filter((n) => parents[n].length === 0);
        if (primaryTypes.length === 0) {
          logger13.throwArgumentError("missing primary type", "types", types);
        } else if (primaryTypes.length > 1) {
          logger13.throwArgumentError(`ambiguous primary types or unused types: ${primaryTypes.map((t) => JSON.stringify(t)).join(", ")}`, "types", types);
        }
        defineReadOnly(this, "primaryType", primaryTypes[0]);
        function checkCircular(type, found) {
          if (found[type]) {
            logger13.throwArgumentError(`circular type reference to ${JSON.stringify(type)}`, "types", types);
          }
          found[type] = true;
          Object.keys(links[type]).forEach((child) => {
            if (!parents[child]) {
              return;
            }
            checkCircular(child, found);
            Object.keys(found).forEach((subtype) => {
              subtypes[subtype][child] = true;
            });
          });
          delete found[type];
        }
        checkCircular(this.primaryType, {});
        for (const name in subtypes) {
          const st = Object.keys(subtypes[name]);
          st.sort();
          this._types[name] = encodeType(name, types[name]) + st.map((t) => encodeType(t, types[t])).join("");
        }
      }
      getEncoder(type) {
        let encoder = this._encoderCache[type];
        if (!encoder) {
          encoder = this._encoderCache[type] = this._getEncoder(type);
        }
        return encoder;
      }
      _getEncoder(type) {
        {
          const encoder = getBaseEncoder(type);
          if (encoder) {
            return encoder;
          }
        }
        const match = type.match(/^(.*)(\x5b(\d*)\x5d)$/);
        if (match) {
          const subtype = match[1];
          const subEncoder = this.getEncoder(subtype);
          const length = parseInt(match[3]);
          return (value) => {
            if (length >= 0 && value.length !== length) {
              logger13.throwArgumentError("array length mismatch; expected length ${ arrayLength }", "value", value);
            }
            let result = value.map(subEncoder);
            if (this._types[subtype]) {
              result = result.map(keccak256);
            }
            return keccak256(hexConcat(result));
          };
        }
        const fields = this.types[type];
        if (fields) {
          const encodedType = id(this._types[type]);
          return (value) => {
            const values = fields.map(({ name, type: type2 }) => {
              const result = this.getEncoder(type2)(value[name]);
              if (this._types[type2]) {
                return keccak256(result);
              }
              return result;
            });
            values.unshift(encodedType);
            return hexConcat(values);
          };
        }
        return logger13.throwArgumentError(`unknown type: ${type}`, "type", type);
      }
      encodeType(name) {
        const result = this._types[name];
        if (!result) {
          logger13.throwArgumentError(`unknown type: ${JSON.stringify(name)}`, "name", name);
        }
        return result;
      }
      encodeData(type, value) {
        return this.getEncoder(type)(value);
      }
      hashStruct(name, value) {
        return keccak256(this.encodeData(name, value));
      }
      encode(value) {
        return this.encodeData(this.primaryType, value);
      }
      hash(value) {
        return this.hashStruct(this.primaryType, value);
      }
      _visit(type, value, callback) {
        {
          const encoder = getBaseEncoder(type);
          if (encoder) {
            return callback(type, value);
          }
        }
        const match = type.match(/^(.*)(\x5b(\d*)\x5d)$/);
        if (match) {
          const subtype = match[1];
          const length = parseInt(match[3]);
          if (length >= 0 && value.length !== length) {
            logger13.throwArgumentError("array length mismatch; expected length ${ arrayLength }", "value", value);
          }
          return value.map((v) => this._visit(subtype, v, callback));
        }
        const fields = this.types[type];
        if (fields) {
          return fields.reduce((accum, { name, type: type2 }) => {
            accum[name] = this._visit(type2, value[name], callback);
            return accum;
          }, {});
        }
        return logger13.throwArgumentError(`unknown type: ${type}`, "type", type);
      }
      visit(value, callback) {
        return this._visit(this.primaryType, value, callback);
      }
      static from(types) {
        return new _TypedDataEncoder(types);
      }
      static getPrimaryType(types) {
        return _TypedDataEncoder.from(types).primaryType;
      }
      static hashStruct(name, types, value) {
        return _TypedDataEncoder.from(types).hashStruct(name, value);
      }
      static hashDomain(domain) {
        const domainFields = [];
        for (const name in domain) {
          const type = domainFieldTypes[name];
          if (!type) {
            logger13.throwArgumentError(`invalid typed-data domain key: ${JSON.stringify(name)}`, "domain", domain);
          }
          domainFields.push({ name, type });
        }
        domainFields.sort((a, b) => {
          return domainFieldNames.indexOf(a.name) - domainFieldNames.indexOf(b.name);
        });
        return _TypedDataEncoder.hashStruct("EIP712Domain", { EIP712Domain: domainFields }, domain);
      }
      static encode(domain, types, value) {
        return hexConcat([
          "0x1901",
          _TypedDataEncoder.hashDomain(domain),
          _TypedDataEncoder.from(types).hash(value)
        ]);
      }
      static hash(domain, types, value) {
        return keccak256(_TypedDataEncoder.encode(domain, types, value));
      }
      // Replaces all address types with ENS names with their looked up address
      static resolveNames(domain, types, value, resolveName) {
        return __awaiter2(this, void 0, void 0, function* () {
          domain = shallowCopy(domain);
          const ensCache = {};
          if (domain.verifyingContract && !isHexString(domain.verifyingContract, 20)) {
            ensCache[domain.verifyingContract] = "0x";
          }
          const encoder = _TypedDataEncoder.from(types);
          encoder.visit(value, (type, value2) => {
            if (type === "address" && !isHexString(value2, 20)) {
              ensCache[value2] = "0x";
            }
            return value2;
          });
          for (const name in ensCache) {
            ensCache[name] = yield resolveName(name);
          }
          if (domain.verifyingContract && ensCache[domain.verifyingContract]) {
            domain.verifyingContract = ensCache[domain.verifyingContract];
          }
          value = encoder.visit(value, (type, value2) => {
            if (type === "address" && ensCache[value2]) {
              return ensCache[value2];
            }
            return value2;
          });
          return { domain, value };
        });
      }
      static getPayload(domain, types, value) {
        _TypedDataEncoder.hashDomain(domain);
        const domainValues = {};
        const domainTypes = [];
        domainFieldNames.forEach((name) => {
          const value2 = domain[name];
          if (value2 == null) {
            return;
          }
          domainValues[name] = domainChecks[name](value2);
          domainTypes.push({ name, type: domainFieldTypes[name] });
        });
        const encoder = _TypedDataEncoder.from(types);
        const typesWithDomain = shallowCopy(types);
        if (typesWithDomain.EIP712Domain) {
          logger13.throwArgumentError("types must not contain EIP712Domain type", "types.EIP712Domain", types);
        } else {
          typesWithDomain.EIP712Domain = domainTypes;
        }
        encoder.encode(value);
        return {
          types: typesWithDomain,
          domain: domainValues,
          primaryType: encoder.primaryType,
          message: encoder.visit(value, (type, value2) => {
            if (type.match(/^bytes(\d*)/)) {
              return hexlify(arrayify(value2));
            }
            if (type.match(/^u?int/)) {
              return BigNumber.from(value2).toString();
            }
            switch (type) {
              case "address":
                return value2.toLowerCase();
              case "bool":
                return !!value2;
              case "string":
                if (typeof value2 !== "string") {
                  logger13.throwArgumentError(`invalid string`, "value", value2);
                }
                return value2;
            }
            return logger13.throwArgumentError("unsupported type", "type", type);
          })
        };
      }
    };
  }
});

// ../../node_modules/@ethersproject/hash/lib.esm/index.js
var lib_exports9 = {};
__export(lib_exports9, {
  _TypedDataEncoder: () => TypedDataEncoder,
  dnsEncode: () => dnsEncode,
  ensNormalize: () => ensNormalize,
  hashMessage: () => hashMessage,
  id: () => id,
  isValidName: () => isValidName,
  messagePrefix: () => messagePrefix,
  namehash: () => namehash
});
var init_lib12 = __esm({
  "../../node_modules/@ethersproject/hash/lib.esm/index.js"() {
    "use strict";
    init_id();
    init_namehash();
    init_message();
    init_namehash();
    init_typed_data();
  }
});

// ../../node_modules/@ethersproject/abi/lib.esm/interface.js
function wrapAccessError(property, error) {
  const wrap = new Error(`deferred error during ABI decoding triggered accessing ${property}`);
  wrap.error = error;
  return wrap;
}
var logger14, LogDescription, TransactionDescription, ErrorDescription, Indexed, BuiltinErrors, Interface;
var init_interface = __esm({
  "../../node_modules/@ethersproject/abi/lib.esm/interface.js"() {
    "use strict";
    init_lib7();
    init_lib3();
    init_lib2();
    init_lib12();
    init_lib5();
    init_lib4();
    init_abi_coder();
    init_abstract_coder();
    init_fragments();
    init_lib();
    init_version5();
    logger14 = new Logger(version5);
    LogDescription = class extends Description {
    };
    TransactionDescription = class extends Description {
    };
    ErrorDescription = class extends Description {
    };
    Indexed = class extends Description {
      static isIndexed(value) {
        return !!(value && value._isIndexed);
      }
    };
    BuiltinErrors = {
      "0x08c379a0": { signature: "Error(string)", name: "Error", inputs: ["string"], reason: true },
      "0x4e487b71": { signature: "Panic(uint256)", name: "Panic", inputs: ["uint256"] }
    };
    Interface = class {
      constructor(fragments) {
        let abi = [];
        if (typeof fragments === "string") {
          abi = JSON.parse(fragments);
        } else {
          abi = fragments;
        }
        defineReadOnly(this, "fragments", abi.map((fragment) => {
          return Fragment.from(fragment);
        }).filter((fragment) => fragment != null));
        defineReadOnly(this, "_abiCoder", getStatic(new.target, "getAbiCoder")());
        defineReadOnly(this, "functions", {});
        defineReadOnly(this, "errors", {});
        defineReadOnly(this, "events", {});
        defineReadOnly(this, "structs", {});
        this.fragments.forEach((fragment) => {
          let bucket = null;
          switch (fragment.type) {
            case "constructor":
              if (this.deploy) {
                logger14.warn("duplicate definition - constructor");
                return;
              }
              defineReadOnly(this, "deploy", fragment);
              return;
            case "function":
              bucket = this.functions;
              break;
            case "event":
              bucket = this.events;
              break;
            case "error":
              bucket = this.errors;
              break;
            default:
              return;
          }
          let signature2 = fragment.format();
          if (bucket[signature2]) {
            logger14.warn("duplicate definition - " + signature2);
            return;
          }
          bucket[signature2] = fragment;
        });
        if (!this.deploy) {
          defineReadOnly(this, "deploy", ConstructorFragment.from({
            payable: false,
            type: "constructor"
          }));
        }
        defineReadOnly(this, "_isInterface", true);
      }
      format(format) {
        if (!format) {
          format = FormatTypes.full;
        }
        if (format === FormatTypes.sighash) {
          logger14.throwArgumentError("interface does not support formatting sighash", "format", format);
        }
        const abi = this.fragments.map((fragment) => fragment.format(format));
        if (format === FormatTypes.json) {
          return JSON.stringify(abi.map((j) => JSON.parse(j)));
        }
        return abi;
      }
      // Sub-classes can override these to handle other blockchains
      static getAbiCoder() {
        return defaultAbiCoder;
      }
      static getAddress(address) {
        return getAddress(address);
      }
      static getSighash(fragment) {
        return hexDataSlice(id(fragment.format()), 0, 4);
      }
      static getEventTopic(eventFragment) {
        return id(eventFragment.format());
      }
      // Find a function definition by any means necessary (unless it is ambiguous)
      getFunction(nameOrSignatureOrSighash) {
        if (isHexString(nameOrSignatureOrSighash)) {
          for (const name in this.functions) {
            if (nameOrSignatureOrSighash === this.getSighash(name)) {
              return this.functions[name];
            }
          }
          logger14.throwArgumentError("no matching function", "sighash", nameOrSignatureOrSighash);
        }
        if (nameOrSignatureOrSighash.indexOf("(") === -1) {
          const name = nameOrSignatureOrSighash.trim();
          const matching = Object.keys(this.functions).filter((f) => f.split(
            "("
            /* fix:) */
          )[0] === name);
          if (matching.length === 0) {
            logger14.throwArgumentError("no matching function", "name", name);
          } else if (matching.length > 1) {
            logger14.throwArgumentError("multiple matching functions", "name", name);
          }
          return this.functions[matching[0]];
        }
        const result = this.functions[FunctionFragment.fromString(nameOrSignatureOrSighash).format()];
        if (!result) {
          logger14.throwArgumentError("no matching function", "signature", nameOrSignatureOrSighash);
        }
        return result;
      }
      // Find an event definition by any means necessary (unless it is ambiguous)
      getEvent(nameOrSignatureOrTopic) {
        if (isHexString(nameOrSignatureOrTopic)) {
          const topichash = nameOrSignatureOrTopic.toLowerCase();
          for (const name in this.events) {
            if (topichash === this.getEventTopic(name)) {
              return this.events[name];
            }
          }
          logger14.throwArgumentError("no matching event", "topichash", topichash);
        }
        if (nameOrSignatureOrTopic.indexOf("(") === -1) {
          const name = nameOrSignatureOrTopic.trim();
          const matching = Object.keys(this.events).filter((f) => f.split(
            "("
            /* fix:) */
          )[0] === name);
          if (matching.length === 0) {
            logger14.throwArgumentError("no matching event", "name", name);
          } else if (matching.length > 1) {
            logger14.throwArgumentError("multiple matching events", "name", name);
          }
          return this.events[matching[0]];
        }
        const result = this.events[EventFragment.fromString(nameOrSignatureOrTopic).format()];
        if (!result) {
          logger14.throwArgumentError("no matching event", "signature", nameOrSignatureOrTopic);
        }
        return result;
      }
      // Find a function definition by any means necessary (unless it is ambiguous)
      getError(nameOrSignatureOrSighash) {
        if (isHexString(nameOrSignatureOrSighash)) {
          const getSighash = getStatic(this.constructor, "getSighash");
          for (const name in this.errors) {
            const error = this.errors[name];
            if (nameOrSignatureOrSighash === getSighash(error)) {
              return this.errors[name];
            }
          }
          logger14.throwArgumentError("no matching error", "sighash", nameOrSignatureOrSighash);
        }
        if (nameOrSignatureOrSighash.indexOf("(") === -1) {
          const name = nameOrSignatureOrSighash.trim();
          const matching = Object.keys(this.errors).filter((f) => f.split(
            "("
            /* fix:) */
          )[0] === name);
          if (matching.length === 0) {
            logger14.throwArgumentError("no matching error", "name", name);
          } else if (matching.length > 1) {
            logger14.throwArgumentError("multiple matching errors", "name", name);
          }
          return this.errors[matching[0]];
        }
        const result = this.errors[FunctionFragment.fromString(nameOrSignatureOrSighash).format()];
        if (!result) {
          logger14.throwArgumentError("no matching error", "signature", nameOrSignatureOrSighash);
        }
        return result;
      }
      // Get the sighash (the bytes4 selector) used by Solidity to identify a function
      getSighash(fragment) {
        if (typeof fragment === "string") {
          try {
            fragment = this.getFunction(fragment);
          } catch (error) {
            try {
              fragment = this.getError(fragment);
            } catch (_) {
              throw error;
            }
          }
        }
        return getStatic(this.constructor, "getSighash")(fragment);
      }
      // Get the topic (the bytes32 hash) used by Solidity to identify an event
      getEventTopic(eventFragment) {
        if (typeof eventFragment === "string") {
          eventFragment = this.getEvent(eventFragment);
        }
        return getStatic(this.constructor, "getEventTopic")(eventFragment);
      }
      _decodeParams(params, data) {
        return this._abiCoder.decode(params, data);
      }
      _encodeParams(params, values) {
        return this._abiCoder.encode(params, values);
      }
      encodeDeploy(values) {
        return this._encodeParams(this.deploy.inputs, values || []);
      }
      decodeErrorResult(fragment, data) {
        if (typeof fragment === "string") {
          fragment = this.getError(fragment);
        }
        const bytes = arrayify(data);
        if (hexlify(bytes.slice(0, 4)) !== this.getSighash(fragment)) {
          logger14.throwArgumentError(`data signature does not match error ${fragment.name}.`, "data", hexlify(bytes));
        }
        return this._decodeParams(fragment.inputs, bytes.slice(4));
      }
      encodeErrorResult(fragment, values) {
        if (typeof fragment === "string") {
          fragment = this.getError(fragment);
        }
        return hexlify(concat([
          this.getSighash(fragment),
          this._encodeParams(fragment.inputs, values || [])
        ]));
      }
      // Decode the data for a function call (e.g. tx.data)
      decodeFunctionData(functionFragment, data) {
        if (typeof functionFragment === "string") {
          functionFragment = this.getFunction(functionFragment);
        }
        const bytes = arrayify(data);
        if (hexlify(bytes.slice(0, 4)) !== this.getSighash(functionFragment)) {
          logger14.throwArgumentError(`data signature does not match function ${functionFragment.name}.`, "data", hexlify(bytes));
        }
        return this._decodeParams(functionFragment.inputs, bytes.slice(4));
      }
      // Encode the data for a function call (e.g. tx.data)
      encodeFunctionData(functionFragment, values) {
        if (typeof functionFragment === "string") {
          functionFragment = this.getFunction(functionFragment);
        }
        return hexlify(concat([
          this.getSighash(functionFragment),
          this._encodeParams(functionFragment.inputs, values || [])
        ]));
      }
      // Decode the result from a function call (e.g. from eth_call)
      decodeFunctionResult(functionFragment, data) {
        if (typeof functionFragment === "string") {
          functionFragment = this.getFunction(functionFragment);
        }
        let bytes = arrayify(data);
        let reason = null;
        let message = "";
        let errorArgs = null;
        let errorName = null;
        let errorSignature = null;
        switch (bytes.length % this._abiCoder._getWordSize()) {
          case 0:
            try {
              return this._abiCoder.decode(functionFragment.outputs, bytes);
            } catch (error) {
            }
            break;
          case 4: {
            const selector = hexlify(bytes.slice(0, 4));
            const builtin = BuiltinErrors[selector];
            if (builtin) {
              errorArgs = this._abiCoder.decode(builtin.inputs, bytes.slice(4));
              errorName = builtin.name;
              errorSignature = builtin.signature;
              if (builtin.reason) {
                reason = errorArgs[0];
              }
              if (errorName === "Error") {
                message = `; VM Exception while processing transaction: reverted with reason string ${JSON.stringify(errorArgs[0])}`;
              } else if (errorName === "Panic") {
                message = `; VM Exception while processing transaction: reverted with panic code ${errorArgs[0]}`;
              }
            } else {
              try {
                const error = this.getError(selector);
                errorArgs = this._abiCoder.decode(error.inputs, bytes.slice(4));
                errorName = error.name;
                errorSignature = error.format();
              } catch (error) {
              }
            }
            break;
          }
        }
        return logger14.throwError("call revert exception" + message, Logger.errors.CALL_EXCEPTION, {
          method: functionFragment.format(),
          data: hexlify(data),
          errorArgs,
          errorName,
          errorSignature,
          reason
        });
      }
      // Encode the result for a function call (e.g. for eth_call)
      encodeFunctionResult(functionFragment, values) {
        if (typeof functionFragment === "string") {
          functionFragment = this.getFunction(functionFragment);
        }
        return hexlify(this._abiCoder.encode(functionFragment.outputs, values || []));
      }
      // Create the filter for the event with search criteria (e.g. for eth_filterLog)
      encodeFilterTopics(eventFragment, values) {
        if (typeof eventFragment === "string") {
          eventFragment = this.getEvent(eventFragment);
        }
        if (values.length > eventFragment.inputs.length) {
          logger14.throwError("too many arguments for " + eventFragment.format(), Logger.errors.UNEXPECTED_ARGUMENT, {
            argument: "values",
            value: values
          });
        }
        let topics = [];
        if (!eventFragment.anonymous) {
          topics.push(this.getEventTopic(eventFragment));
        }
        const encodeTopic = (param, value) => {
          if (param.type === "string") {
            return id(value);
          } else if (param.type === "bytes") {
            return keccak256(hexlify(value));
          }
          if (param.type === "bool" && typeof value === "boolean") {
            value = value ? "0x01" : "0x00";
          }
          if (param.type.match(/^u?int/)) {
            value = BigNumber.from(value).toHexString();
          }
          if (param.type === "address") {
            this._abiCoder.encode(["address"], [value]);
          }
          return hexZeroPad(hexlify(value), 32);
        };
        values.forEach((value, index) => {
          let param = eventFragment.inputs[index];
          if (!param.indexed) {
            if (value != null) {
              logger14.throwArgumentError("cannot filter non-indexed parameters; must be null", "contract." + param.name, value);
            }
            return;
          }
          if (value == null) {
            topics.push(null);
          } else if (param.baseType === "array" || param.baseType === "tuple") {
            logger14.throwArgumentError("filtering with tuples or arrays not supported", "contract." + param.name, value);
          } else if (Array.isArray(value)) {
            topics.push(value.map((value2) => encodeTopic(param, value2)));
          } else {
            topics.push(encodeTopic(param, value));
          }
        });
        while (topics.length && topics[topics.length - 1] === null) {
          topics.pop();
        }
        return topics;
      }
      encodeEventLog(eventFragment, values) {
        if (typeof eventFragment === "string") {
          eventFragment = this.getEvent(eventFragment);
        }
        const topics = [];
        const dataTypes = [];
        const dataValues = [];
        if (!eventFragment.anonymous) {
          topics.push(this.getEventTopic(eventFragment));
        }
        if (values.length !== eventFragment.inputs.length) {
          logger14.throwArgumentError("event arguments/values mismatch", "values", values);
        }
        eventFragment.inputs.forEach((param, index) => {
          const value = values[index];
          if (param.indexed) {
            if (param.type === "string") {
              topics.push(id(value));
            } else if (param.type === "bytes") {
              topics.push(keccak256(value));
            } else if (param.baseType === "tuple" || param.baseType === "array") {
              throw new Error("not implemented");
            } else {
              topics.push(this._abiCoder.encode([param.type], [value]));
            }
          } else {
            dataTypes.push(param);
            dataValues.push(value);
          }
        });
        return {
          data: this._abiCoder.encode(dataTypes, dataValues),
          topics
        };
      }
      // Decode a filter for the event and the search criteria
      decodeEventLog(eventFragment, data, topics) {
        if (typeof eventFragment === "string") {
          eventFragment = this.getEvent(eventFragment);
        }
        if (topics != null && !eventFragment.anonymous) {
          let topicHash = this.getEventTopic(eventFragment);
          if (!isHexString(topics[0], 32) || topics[0].toLowerCase() !== topicHash) {
            logger14.throwError("fragment/topic mismatch", Logger.errors.INVALID_ARGUMENT, { argument: "topics[0]", expected: topicHash, value: topics[0] });
          }
          topics = topics.slice(1);
        }
        let indexed = [];
        let nonIndexed = [];
        let dynamic = [];
        eventFragment.inputs.forEach((param, index) => {
          if (param.indexed) {
            if (param.type === "string" || param.type === "bytes" || param.baseType === "tuple" || param.baseType === "array") {
              indexed.push(ParamType.fromObject({ type: "bytes32", name: param.name }));
              dynamic.push(true);
            } else {
              indexed.push(param);
              dynamic.push(false);
            }
          } else {
            nonIndexed.push(param);
            dynamic.push(false);
          }
        });
        let resultIndexed = topics != null ? this._abiCoder.decode(indexed, concat(topics)) : null;
        let resultNonIndexed = this._abiCoder.decode(nonIndexed, data, true);
        let result = [];
        let nonIndexedIndex = 0, indexedIndex = 0;
        eventFragment.inputs.forEach((param, index) => {
          if (param.indexed) {
            if (resultIndexed == null) {
              result[index] = new Indexed({ _isIndexed: true, hash: null });
            } else if (dynamic[index]) {
              result[index] = new Indexed({ _isIndexed: true, hash: resultIndexed[indexedIndex++] });
            } else {
              try {
                result[index] = resultIndexed[indexedIndex++];
              } catch (error) {
                result[index] = error;
              }
            }
          } else {
            try {
              result[index] = resultNonIndexed[nonIndexedIndex++];
            } catch (error) {
              result[index] = error;
            }
          }
          if (param.name && result[param.name] == null) {
            const value = result[index];
            if (value instanceof Error) {
              Object.defineProperty(result, param.name, {
                enumerable: true,
                get: () => {
                  throw wrapAccessError(`property ${JSON.stringify(param.name)}`, value);
                }
              });
            } else {
              result[param.name] = value;
            }
          }
        });
        for (let i = 0; i < result.length; i++) {
          const value = result[i];
          if (value instanceof Error) {
            Object.defineProperty(result, i, {
              enumerable: true,
              get: () => {
                throw wrapAccessError(`index ${i}`, value);
              }
            });
          }
        }
        return Object.freeze(result);
      }
      // Given a transaction, find the matching function fragment (if any) and
      // determine all its properties and call parameters
      parseTransaction(tx) {
        let fragment = this.getFunction(tx.data.substring(0, 10).toLowerCase());
        if (!fragment) {
          return null;
        }
        return new TransactionDescription({
          args: this._abiCoder.decode(fragment.inputs, "0x" + tx.data.substring(10)),
          functionFragment: fragment,
          name: fragment.name,
          signature: fragment.format(),
          sighash: this.getSighash(fragment),
          value: BigNumber.from(tx.value || "0")
        });
      }
      // @TODO
      //parseCallResult(data: BytesLike): ??
      // Given an event log, find the matching event fragment (if any) and
      // determine all its properties and values
      parseLog(log) {
        let fragment = this.getEvent(log.topics[0]);
        if (!fragment || fragment.anonymous) {
          return null;
        }
        return new LogDescription({
          eventFragment: fragment,
          name: fragment.name,
          signature: fragment.format(),
          topic: this.getEventTopic(fragment),
          args: this.decodeEventLog(fragment, log.data, log.topics)
        });
      }
      parseError(data) {
        const hexData = hexlify(data);
        let fragment = this.getError(hexData.substring(0, 10).toLowerCase());
        if (!fragment) {
          return null;
        }
        return new ErrorDescription({
          args: this._abiCoder.decode(fragment.inputs, "0x" + hexData.substring(10)),
          errorFragment: fragment,
          name: fragment.name,
          signature: fragment.format(),
          sighash: this.getSighash(fragment)
        });
      }
      /*
      static from(value: Array<Fragment | string | JsonAbi> | string | Interface) {
          if (Interface.isInterface(value)) {
              return value;
          }
          if (typeof(value) === "string") {
              return new Interface(JSON.parse(value));
          }
          return new Interface(value);
      }
      */
      static isInterface(value) {
        return !!(value && value._isInterface);
      }
    };
  }
});

// ../../node_modules/@ethersproject/abi/lib.esm/index.js
var lib_exports10 = {};
__export(lib_exports10, {
  AbiCoder: () => AbiCoder,
  ConstructorFragment: () => ConstructorFragment,
  ErrorFragment: () => ErrorFragment,
  EventFragment: () => EventFragment,
  FormatTypes: () => FormatTypes,
  Fragment: () => Fragment,
  FunctionFragment: () => FunctionFragment,
  Indexed: () => Indexed,
  Interface: () => Interface,
  LogDescription: () => LogDescription,
  ParamType: () => ParamType,
  TransactionDescription: () => TransactionDescription,
  checkResultErrors: () => checkResultErrors,
  defaultAbiCoder: () => defaultAbiCoder
});
var init_lib13 = __esm({
  "../../node_modules/@ethersproject/abi/lib.esm/index.js"() {
    "use strict";
    init_fragments();
    init_abi_coder();
    init_interface();
  }
});

// ../../node_modules/@ethersproject/basex/lib.esm/index.js
var lib_exports11 = {};
__export(lib_exports11, {
  Base32: () => Base32,
  Base58: () => Base58,
  BaseX: () => BaseX
});
var BaseX, Base32, Base58;
var init_lib14 = __esm({
  "../../node_modules/@ethersproject/basex/lib.esm/index.js"() {
    "use strict";
    init_lib2();
    init_lib4();
    BaseX = class {
      constructor(alphabet) {
        defineReadOnly(this, "alphabet", alphabet);
        defineReadOnly(this, "base", alphabet.length);
        defineReadOnly(this, "_alphabetMap", {});
        defineReadOnly(this, "_leader", alphabet.charAt(0));
        for (let i = 0; i < alphabet.length; i++) {
          this._alphabetMap[alphabet.charAt(i)] = i;
        }
      }
      encode(value) {
        let source = arrayify(value);
        if (source.length === 0) {
          return "";
        }
        let digits = [0];
        for (let i = 0; i < source.length; ++i) {
          let carry = source[i];
          for (let j = 0; j < digits.length; ++j) {
            carry += digits[j] << 8;
            digits[j] = carry % this.base;
            carry = carry / this.base | 0;
          }
          while (carry > 0) {
            digits.push(carry % this.base);
            carry = carry / this.base | 0;
          }
        }
        let string = "";
        for (let k = 0; source[k] === 0 && k < source.length - 1; ++k) {
          string += this._leader;
        }
        for (let q = digits.length - 1; q >= 0; --q) {
          string += this.alphabet[digits[q]];
        }
        return string;
      }
      decode(value) {
        if (typeof value !== "string") {
          throw new TypeError("Expected String");
        }
        let bytes = [];
        if (value.length === 0) {
          return new Uint8Array(bytes);
        }
        bytes.push(0);
        for (let i = 0; i < value.length; i++) {
          let byte = this._alphabetMap[value[i]];
          if (byte === void 0) {
            throw new Error("Non-base" + this.base + " character");
          }
          let carry = byte;
          for (let j = 0; j < bytes.length; ++j) {
            carry += bytes[j] * this.base;
            bytes[j] = carry & 255;
            carry >>= 8;
          }
          while (carry > 0) {
            bytes.push(carry & 255);
            carry >>= 8;
          }
        }
        for (let k = 0; value[k] === this._leader && k < value.length - 1; ++k) {
          bytes.push(0);
        }
        return arrayify(new Uint8Array(bytes.reverse()));
      }
    };
    Base32 = new BaseX("abcdefghijklmnopqrstuvwxyz234567");
    Base58 = new BaseX("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz");
  }
});

// ../../node_modules/minimalistic-assert/index.js
var require_minimalistic_assert = __commonJS({
  "../../node_modules/minimalistic-assert/index.js"(exports, module) {
    "use strict";
    module.exports = assert2;
    function assert2(val, msg) {
      if (!val)
        throw new Error(msg || "Assertion failed");
    }
    assert2.equal = function assertEqual2(l, r2, msg) {
      if (l != r2)
        throw new Error(msg || "Assertion failed: " + l + " != " + r2);
    };
  }
});

// ../../node_modules/inherits/inherits_browser.js
var require_inherits_browser = __commonJS({
  "../../node_modules/inherits/inherits_browser.js"(exports, module) {
    "use strict";
    if (typeof Object.create === "function") {
      module.exports = function inherits(ctor, superCtor) {
        if (superCtor) {
          ctor.super_ = superCtor;
          ctor.prototype = Object.create(superCtor.prototype, {
            constructor: {
              value: ctor,
              enumerable: false,
              writable: true,
              configurable: true
            }
          });
        }
      };
    } else {
      module.exports = function inherits(ctor, superCtor) {
        if (superCtor) {
          ctor.super_ = superCtor;
          var TempCtor = function() {
          };
          TempCtor.prototype = superCtor.prototype;
          ctor.prototype = new TempCtor();
          ctor.prototype.constructor = ctor;
        }
      };
    }
  }
});

// ../../node_modules/inherits/inherits.js
var require_inherits = __commonJS({
  "../../node_modules/inherits/inherits.js"(exports, module) {
    "use strict";
    try {
      util = __require("util");
      if (typeof util.inherits !== "function") throw "";
      module.exports = util.inherits;
    } catch (e) {
      module.exports = require_inherits_browser();
    }
    var util;
  }
});

// ../../node_modules/hash.js/lib/hash/utils.js
var require_utils = __commonJS({
  "../../node_modules/hash.js/lib/hash/utils.js"(exports) {
    "use strict";
    var assert2 = require_minimalistic_assert();
    var inherits = require_inherits();
    exports.inherits = inherits;
    function isSurrogatePair(msg, i) {
      if ((msg.charCodeAt(i) & 64512) !== 55296) {
        return false;
      }
      if (i < 0 || i + 1 >= msg.length) {
        return false;
      }
      return (msg.charCodeAt(i + 1) & 64512) === 56320;
    }
    function toArray(msg, enc) {
      if (Array.isArray(msg))
        return msg.slice();
      if (!msg)
        return [];
      var res = [];
      if (typeof msg === "string") {
        if (!enc) {
          var p = 0;
          for (var i = 0; i < msg.length; i++) {
            var c = msg.charCodeAt(i);
            if (c < 128) {
              res[p++] = c;
            } else if (c < 2048) {
              res[p++] = c >> 6 | 192;
              res[p++] = c & 63 | 128;
            } else if (isSurrogatePair(msg, i)) {
              c = 65536 + ((c & 1023) << 10) + (msg.charCodeAt(++i) & 1023);
              res[p++] = c >> 18 | 240;
              res[p++] = c >> 12 & 63 | 128;
              res[p++] = c >> 6 & 63 | 128;
              res[p++] = c & 63 | 128;
            } else {
              res[p++] = c >> 12 | 224;
              res[p++] = c >> 6 & 63 | 128;
              res[p++] = c & 63 | 128;
            }
          }
        } else if (enc === "hex") {
          msg = msg.replace(/[^a-z0-9]+/ig, "");
          if (msg.length % 2 !== 0)
            msg = "0" + msg;
          for (i = 0; i < msg.length; i += 2)
            res.push(parseInt(msg[i] + msg[i + 1], 16));
        }
      } else {
        for (i = 0; i < msg.length; i++)
          res[i] = msg[i] | 0;
      }
      return res;
    }
    exports.toArray = toArray;
    function toHex2(msg) {
      var res = "";
      for (var i = 0; i < msg.length; i++)
        res += zero2(msg[i].toString(16));
      return res;
    }
    exports.toHex = toHex2;
    function htonl(w) {
      var res = w >>> 24 | w >>> 8 & 65280 | w << 8 & 16711680 | (w & 255) << 24;
      return res >>> 0;
    }
    exports.htonl = htonl;
    function toHex32(msg, endian) {
      var res = "";
      for (var i = 0; i < msg.length; i++) {
        var w = msg[i];
        if (endian === "little")
          w = htonl(w);
        res += zero8(w.toString(16));
      }
      return res;
    }
    exports.toHex32 = toHex32;
    function zero2(word) {
      if (word.length === 1)
        return "0" + word;
      else
        return word;
    }
    exports.zero2 = zero2;
    function zero8(word) {
      if (word.length === 7)
        return "0" + word;
      else if (word.length === 6)
        return "00" + word;
      else if (word.length === 5)
        return "000" + word;
      else if (word.length === 4)
        return "0000" + word;
      else if (word.length === 3)
        return "00000" + word;
      else if (word.length === 2)
        return "000000" + word;
      else if (word.length === 1)
        return "0000000" + word;
      else
        return word;
    }
    exports.zero8 = zero8;
    function join32(msg, start, end, endian) {
      var len = end - start;
      assert2(len % 4 === 0);
      var res = new Array(len / 4);
      for (var i = 0, k = start; i < res.length; i++, k += 4) {
        var w;
        if (endian === "big")
          w = msg[k] << 24 | msg[k + 1] << 16 | msg[k + 2] << 8 | msg[k + 3];
        else
          w = msg[k + 3] << 24 | msg[k + 2] << 16 | msg[k + 1] << 8 | msg[k];
        res[i] = w >>> 0;
      }
      return res;
    }
    exports.join32 = join32;
    function split32(msg, endian) {
      var res = new Array(msg.length * 4);
      for (var i = 0, k = 0; i < msg.length; i++, k += 4) {
        var m = msg[i];
        if (endian === "big") {
          res[k] = m >>> 24;
          res[k + 1] = m >>> 16 & 255;
          res[k + 2] = m >>> 8 & 255;
          res[k + 3] = m & 255;
        } else {
          res[k + 3] = m >>> 24;
          res[k + 2] = m >>> 16 & 255;
          res[k + 1] = m >>> 8 & 255;
          res[k] = m & 255;
        }
      }
      return res;
    }
    exports.split32 = split32;
    function rotr32(w, b) {
      return w >>> b | w << 32 - b;
    }
    exports.rotr32 = rotr32;
    function rotl32(w, b) {
      return w << b | w >>> 32 - b;
    }
    exports.rotl32 = rotl32;
    function sum32(a, b) {
      return a + b >>> 0;
    }
    exports.sum32 = sum32;
    function sum32_3(a, b, c) {
      return a + b + c >>> 0;
    }
    exports.sum32_3 = sum32_3;
    function sum32_4(a, b, c, d) {
      return a + b + c + d >>> 0;
    }
    exports.sum32_4 = sum32_4;
    function sum32_5(a, b, c, d, e) {
      return a + b + c + d + e >>> 0;
    }
    exports.sum32_5 = sum32_5;
    function sum64(buf, pos, ah, al) {
      var bh = buf[pos];
      var bl = buf[pos + 1];
      var lo = al + bl >>> 0;
      var hi = (lo < al ? 1 : 0) + ah + bh;
      buf[pos] = hi >>> 0;
      buf[pos + 1] = lo;
    }
    exports.sum64 = sum64;
    function sum64_hi(ah, al, bh, bl) {
      var lo = al + bl >>> 0;
      var hi = (lo < al ? 1 : 0) + ah + bh;
      return hi >>> 0;
    }
    exports.sum64_hi = sum64_hi;
    function sum64_lo(ah, al, bh, bl) {
      var lo = al + bl;
      return lo >>> 0;
    }
    exports.sum64_lo = sum64_lo;
    function sum64_4_hi(ah, al, bh, bl, ch, cl, dh, dl) {
      var carry = 0;
      var lo = al;
      lo = lo + bl >>> 0;
      carry += lo < al ? 1 : 0;
      lo = lo + cl >>> 0;
      carry += lo < cl ? 1 : 0;
      lo = lo + dl >>> 0;
      carry += lo < dl ? 1 : 0;
      var hi = ah + bh + ch + dh + carry;
      return hi >>> 0;
    }
    exports.sum64_4_hi = sum64_4_hi;
    function sum64_4_lo(ah, al, bh, bl, ch, cl, dh, dl) {
      var lo = al + bl + cl + dl;
      return lo >>> 0;
    }
    exports.sum64_4_lo = sum64_4_lo;
    function sum64_5_hi(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
      var carry = 0;
      var lo = al;
      lo = lo + bl >>> 0;
      carry += lo < al ? 1 : 0;
      lo = lo + cl >>> 0;
      carry += lo < cl ? 1 : 0;
      lo = lo + dl >>> 0;
      carry += lo < dl ? 1 : 0;
      lo = lo + el >>> 0;
      carry += lo < el ? 1 : 0;
      var hi = ah + bh + ch + dh + eh + carry;
      return hi >>> 0;
    }
    exports.sum64_5_hi = sum64_5_hi;
    function sum64_5_lo(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
      var lo = al + bl + cl + dl + el;
      return lo >>> 0;
    }
    exports.sum64_5_lo = sum64_5_lo;
    function rotr64_hi(ah, al, num) {
      var r2 = al << 32 - num | ah >>> num;
      return r2 >>> 0;
    }
    exports.rotr64_hi = rotr64_hi;
    function rotr64_lo(ah, al, num) {
      var r2 = ah << 32 - num | al >>> num;
      return r2 >>> 0;
    }
    exports.rotr64_lo = rotr64_lo;
    function shr64_hi(ah, al, num) {
      return ah >>> num;
    }
    exports.shr64_hi = shr64_hi;
    function shr64_lo(ah, al, num) {
      var r2 = ah << 32 - num | al >>> num;
      return r2 >>> 0;
    }
    exports.shr64_lo = shr64_lo;
  }
});

// ../../node_modules/hash.js/lib/hash/common.js
var require_common = __commonJS({
  "../../node_modules/hash.js/lib/hash/common.js"(exports) {
    "use strict";
    var utils = require_utils();
    var assert2 = require_minimalistic_assert();
    function BlockHash() {
      this.pending = null;
      this.pendingTotal = 0;
      this.blockSize = this.constructor.blockSize;
      this.outSize = this.constructor.outSize;
      this.hmacStrength = this.constructor.hmacStrength;
      this.padLength = this.constructor.padLength / 8;
      this.endian = "big";
      this._delta8 = this.blockSize / 8;
      this._delta32 = this.blockSize / 32;
    }
    exports.BlockHash = BlockHash;
    BlockHash.prototype.update = function update2(msg, enc) {
      msg = utils.toArray(msg, enc);
      if (!this.pending)
        this.pending = msg;
      else
        this.pending = this.pending.concat(msg);
      this.pendingTotal += msg.length;
      if (this.pending.length >= this._delta8) {
        msg = this.pending;
        var r2 = msg.length % this._delta8;
        this.pending = msg.slice(msg.length - r2, msg.length);
        if (this.pending.length === 0)
          this.pending = null;
        msg = utils.join32(msg, 0, msg.length - r2, this.endian);
        for (var i = 0; i < msg.length; i += this._delta32)
          this._update(msg, i, i + this._delta32);
      }
      return this;
    };
    BlockHash.prototype.digest = function digest(enc) {
      this.update(this._pad());
      assert2(this.pending === null);
      return this._digest(enc);
    };
    BlockHash.prototype._pad = function pad() {
      var len = this.pendingTotal;
      var bytes = this._delta8;
      var k = bytes - (len + this.padLength) % bytes;
      var res = new Array(k + this.padLength);
      res[0] = 128;
      for (var i = 1; i < k; i++)
        res[i] = 0;
      len <<= 3;
      if (this.endian === "big") {
        for (var t = 8; t < this.padLength; t++)
          res[i++] = 0;
        res[i++] = 0;
        res[i++] = 0;
        res[i++] = 0;
        res[i++] = 0;
        res[i++] = len >>> 24 & 255;
        res[i++] = len >>> 16 & 255;
        res[i++] = len >>> 8 & 255;
        res[i++] = len & 255;
      } else {
        res[i++] = len & 255;
        res[i++] = len >>> 8 & 255;
        res[i++] = len >>> 16 & 255;
        res[i++] = len >>> 24 & 255;
        res[i++] = 0;
        res[i++] = 0;
        res[i++] = 0;
        res[i++] = 0;
        for (t = 8; t < this.padLength; t++)
          res[i++] = 0;
      }
      return res;
    };
  }
});

// ../../node_modules/hash.js/lib/hash/sha/common.js
var require_common2 = __commonJS({
  "../../node_modules/hash.js/lib/hash/sha/common.js"(exports) {
    "use strict";
    var utils = require_utils();
    var rotr32 = utils.rotr32;
    function ft_1(s, x, y, z) {
      if (s === 0)
        return ch32(x, y, z);
      if (s === 1 || s === 3)
        return p32(x, y, z);
      if (s === 2)
        return maj32(x, y, z);
    }
    exports.ft_1 = ft_1;
    function ch32(x, y, z) {
      return x & y ^ ~x & z;
    }
    exports.ch32 = ch32;
    function maj32(x, y, z) {
      return x & y ^ x & z ^ y & z;
    }
    exports.maj32 = maj32;
    function p32(x, y, z) {
      return x ^ y ^ z;
    }
    exports.p32 = p32;
    function s0_256(x) {
      return rotr32(x, 2) ^ rotr32(x, 13) ^ rotr32(x, 22);
    }
    exports.s0_256 = s0_256;
    function s1_256(x) {
      return rotr32(x, 6) ^ rotr32(x, 11) ^ rotr32(x, 25);
    }
    exports.s1_256 = s1_256;
    function g0_256(x) {
      return rotr32(x, 7) ^ rotr32(x, 18) ^ x >>> 3;
    }
    exports.g0_256 = g0_256;
    function g1_256(x) {
      return rotr32(x, 17) ^ rotr32(x, 19) ^ x >>> 10;
    }
    exports.g1_256 = g1_256;
  }
});

// ../../node_modules/hash.js/lib/hash/sha/1.js
var require__ = __commonJS({
  "../../node_modules/hash.js/lib/hash/sha/1.js"(exports, module) {
    "use strict";
    var utils = require_utils();
    var common = require_common();
    var shaCommon = require_common2();
    var rotl32 = utils.rotl32;
    var sum32 = utils.sum32;
    var sum32_5 = utils.sum32_5;
    var ft_1 = shaCommon.ft_1;
    var BlockHash = common.BlockHash;
    var sha1_K = [
      1518500249,
      1859775393,
      2400959708,
      3395469782
    ];
    function SHA1() {
      if (!(this instanceof SHA1))
        return new SHA1();
      BlockHash.call(this);
      this.h = [
        1732584193,
        4023233417,
        2562383102,
        271733878,
        3285377520
      ];
      this.W = new Array(80);
    }
    utils.inherits(SHA1, BlockHash);
    module.exports = SHA1;
    SHA1.blockSize = 512;
    SHA1.outSize = 160;
    SHA1.hmacStrength = 80;
    SHA1.padLength = 64;
    SHA1.prototype._update = function _update(msg, start) {
      var W = this.W;
      for (var i = 0; i < 16; i++)
        W[i] = msg[start + i];
      for (; i < W.length; i++)
        W[i] = rotl32(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
      var a = this.h[0];
      var b = this.h[1];
      var c = this.h[2];
      var d = this.h[3];
      var e = this.h[4];
      for (i = 0; i < W.length; i++) {
        var s = ~~(i / 20);
        var t = sum32_5(rotl32(a, 5), ft_1(s, b, c, d), e, W[i], sha1_K[s]);
        e = d;
        d = c;
        c = rotl32(b, 30);
        b = a;
        a = t;
      }
      this.h[0] = sum32(this.h[0], a);
      this.h[1] = sum32(this.h[1], b);
      this.h[2] = sum32(this.h[2], c);
      this.h[3] = sum32(this.h[3], d);
      this.h[4] = sum32(this.h[4], e);
    };
    SHA1.prototype._digest = function digest(enc) {
      if (enc === "hex")
        return utils.toHex32(this.h, "big");
      else
        return utils.split32(this.h, "big");
    };
  }
});

// ../../node_modules/hash.js/lib/hash/sha/256.js
var require__2 = __commonJS({
  "../../node_modules/hash.js/lib/hash/sha/256.js"(exports, module) {
    "use strict";
    var utils = require_utils();
    var common = require_common();
    var shaCommon = require_common2();
    var assert2 = require_minimalistic_assert();
    var sum32 = utils.sum32;
    var sum32_4 = utils.sum32_4;
    var sum32_5 = utils.sum32_5;
    var ch32 = shaCommon.ch32;
    var maj32 = shaCommon.maj32;
    var s0_256 = shaCommon.s0_256;
    var s1_256 = shaCommon.s1_256;
    var g0_256 = shaCommon.g0_256;
    var g1_256 = shaCommon.g1_256;
    var BlockHash = common.BlockHash;
    var sha256_K = [
      1116352408,
      1899447441,
      3049323471,
      3921009573,
      961987163,
      1508970993,
      2453635748,
      2870763221,
      3624381080,
      310598401,
      607225278,
      1426881987,
      1925078388,
      2162078206,
      2614888103,
      3248222580,
      3835390401,
      4022224774,
      264347078,
      604807628,
      770255983,
      1249150122,
      1555081692,
      1996064986,
      2554220882,
      2821834349,
      2952996808,
      3210313671,
      3336571891,
      3584528711,
      113926993,
      338241895,
      666307205,
      773529912,
      1294757372,
      1396182291,
      1695183700,
      1986661051,
      2177026350,
      2456956037,
      2730485921,
      2820302411,
      3259730800,
      3345764771,
      3516065817,
      3600352804,
      4094571909,
      275423344,
      430227734,
      506948616,
      659060556,
      883997877,
      958139571,
      1322822218,
      1537002063,
      1747873779,
      1955562222,
      2024104815,
      2227730452,
      2361852424,
      2428436474,
      2756734187,
      3204031479,
      3329325298
    ];
    function SHA256() {
      if (!(this instanceof SHA256))
        return new SHA256();
      BlockHash.call(this);
      this.h = [
        1779033703,
        3144134277,
        1013904242,
        2773480762,
        1359893119,
        2600822924,
        528734635,
        1541459225
      ];
      this.k = sha256_K;
      this.W = new Array(64);
    }
    utils.inherits(SHA256, BlockHash);
    module.exports = SHA256;
    SHA256.blockSize = 512;
    SHA256.outSize = 256;
    SHA256.hmacStrength = 192;
    SHA256.padLength = 64;
    SHA256.prototype._update = function _update(msg, start) {
      var W = this.W;
      for (var i = 0; i < 16; i++)
        W[i] = msg[start + i];
      for (; i < W.length; i++)
        W[i] = sum32_4(g1_256(W[i - 2]), W[i - 7], g0_256(W[i - 15]), W[i - 16]);
      var a = this.h[0];
      var b = this.h[1];
      var c = this.h[2];
      var d = this.h[3];
      var e = this.h[4];
      var f = this.h[5];
      var g = this.h[6];
      var h = this.h[7];
      assert2(this.k.length === W.length);
      for (i = 0; i < W.length; i++) {
        var T1 = sum32_5(h, s1_256(e), ch32(e, f, g), this.k[i], W[i]);
        var T2 = sum32(s0_256(a), maj32(a, b, c));
        h = g;
        g = f;
        f = e;
        e = sum32(d, T1);
        d = c;
        c = b;
        b = a;
        a = sum32(T1, T2);
      }
      this.h[0] = sum32(this.h[0], a);
      this.h[1] = sum32(this.h[1], b);
      this.h[2] = sum32(this.h[2], c);
      this.h[3] = sum32(this.h[3], d);
      this.h[4] = sum32(this.h[4], e);
      this.h[5] = sum32(this.h[5], f);
      this.h[6] = sum32(this.h[6], g);
      this.h[7] = sum32(this.h[7], h);
    };
    SHA256.prototype._digest = function digest(enc) {
      if (enc === "hex")
        return utils.toHex32(this.h, "big");
      else
        return utils.split32(this.h, "big");
    };
  }
});

// ../../node_modules/hash.js/lib/hash/sha/224.js
var require__3 = __commonJS({
  "../../node_modules/hash.js/lib/hash/sha/224.js"(exports, module) {
    "use strict";
    var utils = require_utils();
    var SHA256 = require__2();
    function SHA224() {
      if (!(this instanceof SHA224))
        return new SHA224();
      SHA256.call(this);
      this.h = [
        3238371032,
        914150663,
        812702999,
        4144912697,
        4290775857,
        1750603025,
        1694076839,
        3204075428
      ];
    }
    utils.inherits(SHA224, SHA256);
    module.exports = SHA224;
    SHA224.blockSize = 512;
    SHA224.outSize = 224;
    SHA224.hmacStrength = 192;
    SHA224.padLength = 64;
    SHA224.prototype._digest = function digest(enc) {
      if (enc === "hex")
        return utils.toHex32(this.h.slice(0, 7), "big");
      else
        return utils.split32(this.h.slice(0, 7), "big");
    };
  }
});

// ../../node_modules/hash.js/lib/hash/sha/512.js
var require__4 = __commonJS({
  "../../node_modules/hash.js/lib/hash/sha/512.js"(exports, module) {
    "use strict";
    var utils = require_utils();
    var common = require_common();
    var assert2 = require_minimalistic_assert();
    var rotr64_hi = utils.rotr64_hi;
    var rotr64_lo = utils.rotr64_lo;
    var shr64_hi = utils.shr64_hi;
    var shr64_lo = utils.shr64_lo;
    var sum64 = utils.sum64;
    var sum64_hi = utils.sum64_hi;
    var sum64_lo = utils.sum64_lo;
    var sum64_4_hi = utils.sum64_4_hi;
    var sum64_4_lo = utils.sum64_4_lo;
    var sum64_5_hi = utils.sum64_5_hi;
    var sum64_5_lo = utils.sum64_5_lo;
    var BlockHash = common.BlockHash;
    var sha512_K = [
      1116352408,
      3609767458,
      1899447441,
      602891725,
      3049323471,
      3964484399,
      3921009573,
      2173295548,
      961987163,
      4081628472,
      1508970993,
      3053834265,
      2453635748,
      2937671579,
      2870763221,
      3664609560,
      3624381080,
      2734883394,
      310598401,
      1164996542,
      607225278,
      1323610764,
      1426881987,
      3590304994,
      1925078388,
      4068182383,
      2162078206,
      991336113,
      2614888103,
      633803317,
      3248222580,
      3479774868,
      3835390401,
      2666613458,
      4022224774,
      944711139,
      264347078,
      2341262773,
      604807628,
      2007800933,
      770255983,
      1495990901,
      1249150122,
      1856431235,
      1555081692,
      3175218132,
      1996064986,
      2198950837,
      2554220882,
      3999719339,
      2821834349,
      766784016,
      2952996808,
      2566594879,
      3210313671,
      3203337956,
      3336571891,
      1034457026,
      3584528711,
      2466948901,
      113926993,
      3758326383,
      338241895,
      168717936,
      666307205,
      1188179964,
      773529912,
      1546045734,
      1294757372,
      1522805485,
      1396182291,
      2643833823,
      1695183700,
      2343527390,
      1986661051,
      1014477480,
      2177026350,
      1206759142,
      2456956037,
      344077627,
      2730485921,
      1290863460,
      2820302411,
      3158454273,
      3259730800,
      3505952657,
      3345764771,
      106217008,
      3516065817,
      3606008344,
      3600352804,
      1432725776,
      4094571909,
      1467031594,
      275423344,
      851169720,
      430227734,
      3100823752,
      506948616,
      1363258195,
      659060556,
      3750685593,
      883997877,
      3785050280,
      958139571,
      3318307427,
      1322822218,
      3812723403,
      1537002063,
      2003034995,
      1747873779,
      3602036899,
      1955562222,
      1575990012,
      2024104815,
      1125592928,
      2227730452,
      2716904306,
      2361852424,
      442776044,
      2428436474,
      593698344,
      2756734187,
      3733110249,
      3204031479,
      2999351573,
      3329325298,
      3815920427,
      3391569614,
      3928383900,
      3515267271,
      566280711,
      3940187606,
      3454069534,
      4118630271,
      4000239992,
      116418474,
      1914138554,
      174292421,
      2731055270,
      289380356,
      3203993006,
      460393269,
      320620315,
      685471733,
      587496836,
      852142971,
      1086792851,
      1017036298,
      365543100,
      1126000580,
      2618297676,
      1288033470,
      3409855158,
      1501505948,
      4234509866,
      1607167915,
      987167468,
      1816402316,
      1246189591
    ];
    function SHA512() {
      if (!(this instanceof SHA512))
        return new SHA512();
      BlockHash.call(this);
      this.h = [
        1779033703,
        4089235720,
        3144134277,
        2227873595,
        1013904242,
        4271175723,
        2773480762,
        1595750129,
        1359893119,
        2917565137,
        2600822924,
        725511199,
        528734635,
        4215389547,
        1541459225,
        327033209
      ];
      this.k = sha512_K;
      this.W = new Array(160);
    }
    utils.inherits(SHA512, BlockHash);
    module.exports = SHA512;
    SHA512.blockSize = 1024;
    SHA512.outSize = 512;
    SHA512.hmacStrength = 192;
    SHA512.padLength = 128;
    SHA512.prototype._prepareBlock = function _prepareBlock(msg, start) {
      var W = this.W;
      for (var i = 0; i < 32; i++)
        W[i] = msg[start + i];
      for (; i < W.length; i += 2) {
        var c0_hi = g1_512_hi(W[i - 4], W[i - 3]);
        var c0_lo = g1_512_lo(W[i - 4], W[i - 3]);
        var c1_hi = W[i - 14];
        var c1_lo = W[i - 13];
        var c2_hi = g0_512_hi(W[i - 30], W[i - 29]);
        var c2_lo = g0_512_lo(W[i - 30], W[i - 29]);
        var c3_hi = W[i - 32];
        var c3_lo = W[i - 31];
        W[i] = sum64_4_hi(
          c0_hi,
          c0_lo,
          c1_hi,
          c1_lo,
          c2_hi,
          c2_lo,
          c3_hi,
          c3_lo
        );
        W[i + 1] = sum64_4_lo(
          c0_hi,
          c0_lo,
          c1_hi,
          c1_lo,
          c2_hi,
          c2_lo,
          c3_hi,
          c3_lo
        );
      }
    };
    SHA512.prototype._update = function _update(msg, start) {
      this._prepareBlock(msg, start);
      var W = this.W;
      var ah = this.h[0];
      var al = this.h[1];
      var bh = this.h[2];
      var bl = this.h[3];
      var ch = this.h[4];
      var cl = this.h[5];
      var dh = this.h[6];
      var dl = this.h[7];
      var eh = this.h[8];
      var el = this.h[9];
      var fh = this.h[10];
      var fl = this.h[11];
      var gh = this.h[12];
      var gl = this.h[13];
      var hh = this.h[14];
      var hl = this.h[15];
      assert2(this.k.length === W.length);
      for (var i = 0; i < W.length; i += 2) {
        var c0_hi = hh;
        var c0_lo = hl;
        var c1_hi = s1_512_hi(eh, el);
        var c1_lo = s1_512_lo(eh, el);
        var c2_hi = ch64_hi(eh, el, fh, fl, gh, gl);
        var c2_lo = ch64_lo(eh, el, fh, fl, gh, gl);
        var c3_hi = this.k[i];
        var c3_lo = this.k[i + 1];
        var c4_hi = W[i];
        var c4_lo = W[i + 1];
        var T1_hi = sum64_5_hi(
          c0_hi,
          c0_lo,
          c1_hi,
          c1_lo,
          c2_hi,
          c2_lo,
          c3_hi,
          c3_lo,
          c4_hi,
          c4_lo
        );
        var T1_lo = sum64_5_lo(
          c0_hi,
          c0_lo,
          c1_hi,
          c1_lo,
          c2_hi,
          c2_lo,
          c3_hi,
          c3_lo,
          c4_hi,
          c4_lo
        );
        c0_hi = s0_512_hi(ah, al);
        c0_lo = s0_512_lo(ah, al);
        c1_hi = maj64_hi(ah, al, bh, bl, ch, cl);
        c1_lo = maj64_lo(ah, al, bh, bl, ch, cl);
        var T2_hi = sum64_hi(c0_hi, c0_lo, c1_hi, c1_lo);
        var T2_lo = sum64_lo(c0_hi, c0_lo, c1_hi, c1_lo);
        hh = gh;
        hl = gl;
        gh = fh;
        gl = fl;
        fh = eh;
        fl = el;
        eh = sum64_hi(dh, dl, T1_hi, T1_lo);
        el = sum64_lo(dl, dl, T1_hi, T1_lo);
        dh = ch;
        dl = cl;
        ch = bh;
        cl = bl;
        bh = ah;
        bl = al;
        ah = sum64_hi(T1_hi, T1_lo, T2_hi, T2_lo);
        al = sum64_lo(T1_hi, T1_lo, T2_hi, T2_lo);
      }
      sum64(this.h, 0, ah, al);
      sum64(this.h, 2, bh, bl);
      sum64(this.h, 4, ch, cl);
      sum64(this.h, 6, dh, dl);
      sum64(this.h, 8, eh, el);
      sum64(this.h, 10, fh, fl);
      sum64(this.h, 12, gh, gl);
      sum64(this.h, 14, hh, hl);
    };
    SHA512.prototype._digest = function digest(enc) {
      if (enc === "hex")
        return utils.toHex32(this.h, "big");
      else
        return utils.split32(this.h, "big");
    };
    function ch64_hi(xh, xl, yh, yl, zh) {
      var r2 = xh & yh ^ ~xh & zh;
      if (r2 < 0)
        r2 += 4294967296;
      return r2;
    }
    function ch64_lo(xh, xl, yh, yl, zh, zl) {
      var r2 = xl & yl ^ ~xl & zl;
      if (r2 < 0)
        r2 += 4294967296;
      return r2;
    }
    function maj64_hi(xh, xl, yh, yl, zh) {
      var r2 = xh & yh ^ xh & zh ^ yh & zh;
      if (r2 < 0)
        r2 += 4294967296;
      return r2;
    }
    function maj64_lo(xh, xl, yh, yl, zh, zl) {
      var r2 = xl & yl ^ xl & zl ^ yl & zl;
      if (r2 < 0)
        r2 += 4294967296;
      return r2;
    }
    function s0_512_hi(xh, xl) {
      var c0_hi = rotr64_hi(xh, xl, 28);
      var c1_hi = rotr64_hi(xl, xh, 2);
      var c2_hi = rotr64_hi(xl, xh, 7);
      var r2 = c0_hi ^ c1_hi ^ c2_hi;
      if (r2 < 0)
        r2 += 4294967296;
      return r2;
    }
    function s0_512_lo(xh, xl) {
      var c0_lo = rotr64_lo(xh, xl, 28);
      var c1_lo = rotr64_lo(xl, xh, 2);
      var c2_lo = rotr64_lo(xl, xh, 7);
      var r2 = c0_lo ^ c1_lo ^ c2_lo;
      if (r2 < 0)
        r2 += 4294967296;
      return r2;
    }
    function s1_512_hi(xh, xl) {
      var c0_hi = rotr64_hi(xh, xl, 14);
      var c1_hi = rotr64_hi(xh, xl, 18);
      var c2_hi = rotr64_hi(xl, xh, 9);
      var r2 = c0_hi ^ c1_hi ^ c2_hi;
      if (r2 < 0)
        r2 += 4294967296;
      return r2;
    }
    function s1_512_lo(xh, xl) {
      var c0_lo = rotr64_lo(xh, xl, 14);
      var c1_lo = rotr64_lo(xh, xl, 18);
      var c2_lo = rotr64_lo(xl, xh, 9);
      var r2 = c0_lo ^ c1_lo ^ c2_lo;
      if (r2 < 0)
        r2 += 4294967296;
      return r2;
    }
    function g0_512_hi(xh, xl) {
      var c0_hi = rotr64_hi(xh, xl, 1);
      var c1_hi = rotr64_hi(xh, xl, 8);
      var c2_hi = shr64_hi(xh, xl, 7);
      var r2 = c0_hi ^ c1_hi ^ c2_hi;
      if (r2 < 0)
        r2 += 4294967296;
      return r2;
    }
    function g0_512_lo(xh, xl) {
      var c0_lo = rotr64_lo(xh, xl, 1);
      var c1_lo = rotr64_lo(xh, xl, 8);
      var c2_lo = shr64_lo(xh, xl, 7);
      var r2 = c0_lo ^ c1_lo ^ c2_lo;
      if (r2 < 0)
        r2 += 4294967296;
      return r2;
    }
    function g1_512_hi(xh, xl) {
      var c0_hi = rotr64_hi(xh, xl, 19);
      var c1_hi = rotr64_hi(xl, xh, 29);
      var c2_hi = shr64_hi(xh, xl, 6);
      var r2 = c0_hi ^ c1_hi ^ c2_hi;
      if (r2 < 0)
        r2 += 4294967296;
      return r2;
    }
    function g1_512_lo(xh, xl) {
      var c0_lo = rotr64_lo(xh, xl, 19);
      var c1_lo = rotr64_lo(xl, xh, 29);
      var c2_lo = shr64_lo(xh, xl, 6);
      var r2 = c0_lo ^ c1_lo ^ c2_lo;
      if (r2 < 0)
        r2 += 4294967296;
      return r2;
    }
  }
});

// ../../node_modules/hash.js/lib/hash/sha/384.js
var require__5 = __commonJS({
  "../../node_modules/hash.js/lib/hash/sha/384.js"(exports, module) {
    "use strict";
    var utils = require_utils();
    var SHA512 = require__4();
    function SHA384() {
      if (!(this instanceof SHA384))
        return new SHA384();
      SHA512.call(this);
      this.h = [
        3418070365,
        3238371032,
        1654270250,
        914150663,
        2438529370,
        812702999,
        355462360,
        4144912697,
        1731405415,
        4290775857,
        2394180231,
        1750603025,
        3675008525,
        1694076839,
        1203062813,
        3204075428
      ];
    }
    utils.inherits(SHA384, SHA512);
    module.exports = SHA384;
    SHA384.blockSize = 1024;
    SHA384.outSize = 384;
    SHA384.hmacStrength = 192;
    SHA384.padLength = 128;
    SHA384.prototype._digest = function digest(enc) {
      if (enc === "hex")
        return utils.toHex32(this.h.slice(0, 12), "big");
      else
        return utils.split32(this.h.slice(0, 12), "big");
    };
  }
});

// ../../node_modules/hash.js/lib/hash/sha.js
var require_sha = __commonJS({
  "../../node_modules/hash.js/lib/hash/sha.js"(exports) {
    "use strict";
    exports.sha1 = require__();
    exports.sha224 = require__3();
    exports.sha256 = require__2();
    exports.sha384 = require__5();
    exports.sha512 = require__4();
  }
});

// ../../node_modules/hash.js/lib/hash/ripemd.js
var require_ripemd = __commonJS({
  "../../node_modules/hash.js/lib/hash/ripemd.js"(exports) {
    "use strict";
    var utils = require_utils();
    var common = require_common();
    var rotl32 = utils.rotl32;
    var sum32 = utils.sum32;
    var sum32_3 = utils.sum32_3;
    var sum32_4 = utils.sum32_4;
    var BlockHash = common.BlockHash;
    function RIPEMD160() {
      if (!(this instanceof RIPEMD160))
        return new RIPEMD160();
      BlockHash.call(this);
      this.h = [1732584193, 4023233417, 2562383102, 271733878, 3285377520];
      this.endian = "little";
    }
    utils.inherits(RIPEMD160, BlockHash);
    exports.ripemd160 = RIPEMD160;
    RIPEMD160.blockSize = 512;
    RIPEMD160.outSize = 160;
    RIPEMD160.hmacStrength = 192;
    RIPEMD160.padLength = 64;
    RIPEMD160.prototype._update = function update2(msg, start) {
      var A = this.h[0];
      var B = this.h[1];
      var C = this.h[2];
      var D = this.h[3];
      var E = this.h[4];
      var Ah = A;
      var Bh = B;
      var Ch = C;
      var Dh = D;
      var Eh = E;
      for (var j = 0; j < 80; j++) {
        var T = sum32(
          rotl32(
            sum32_4(A, f(j, B, C, D), msg[r2[j] + start], K(j)),
            s[j]
          ),
          E
        );
        A = E;
        E = D;
        D = rotl32(C, 10);
        C = B;
        B = T;
        T = sum32(
          rotl32(
            sum32_4(Ah, f(79 - j, Bh, Ch, Dh), msg[rh[j] + start], Kh(j)),
            sh[j]
          ),
          Eh
        );
        Ah = Eh;
        Eh = Dh;
        Dh = rotl32(Ch, 10);
        Ch = Bh;
        Bh = T;
      }
      T = sum32_3(this.h[1], C, Dh);
      this.h[1] = sum32_3(this.h[2], D, Eh);
      this.h[2] = sum32_3(this.h[3], E, Ah);
      this.h[3] = sum32_3(this.h[4], A, Bh);
      this.h[4] = sum32_3(this.h[0], B, Ch);
      this.h[0] = T;
    };
    RIPEMD160.prototype._digest = function digest(enc) {
      if (enc === "hex")
        return utils.toHex32(this.h, "little");
      else
        return utils.split32(this.h, "little");
    };
    function f(j, x, y, z) {
      if (j <= 15)
        return x ^ y ^ z;
      else if (j <= 31)
        return x & y | ~x & z;
      else if (j <= 47)
        return (x | ~y) ^ z;
      else if (j <= 63)
        return x & z | y & ~z;
      else
        return x ^ (y | ~z);
    }
    function K(j) {
      if (j <= 15)
        return 0;
      else if (j <= 31)
        return 1518500249;
      else if (j <= 47)
        return 1859775393;
      else if (j <= 63)
        return 2400959708;
      else
        return 2840853838;
    }
    function Kh(j) {
      if (j <= 15)
        return 1352829926;
      else if (j <= 31)
        return 1548603684;
      else if (j <= 47)
        return 1836072691;
      else if (j <= 63)
        return 2053994217;
      else
        return 0;
    }
    var r2 = [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      7,
      4,
      13,
      1,
      10,
      6,
      15,
      3,
      12,
      0,
      9,
      5,
      2,
      14,
      11,
      8,
      3,
      10,
      14,
      4,
      9,
      15,
      8,
      1,
      2,
      7,
      0,
      6,
      13,
      11,
      5,
      12,
      1,
      9,
      11,
      10,
      0,
      8,
      12,
      4,
      13,
      3,
      7,
      15,
      14,
      5,
      6,
      2,
      4,
      0,
      5,
      9,
      7,
      12,
      2,
      10,
      14,
      1,
      3,
      8,
      11,
      6,
      15,
      13
    ];
    var rh = [
      5,
      14,
      7,
      0,
      9,
      2,
      11,
      4,
      13,
      6,
      15,
      8,
      1,
      10,
      3,
      12,
      6,
      11,
      3,
      7,
      0,
      13,
      5,
      10,
      14,
      15,
      8,
      12,
      4,
      9,
      1,
      2,
      15,
      5,
      1,
      3,
      7,
      14,
      6,
      9,
      11,
      8,
      12,
      2,
      10,
      0,
      4,
      13,
      8,
      6,
      4,
      1,
      3,
      11,
      15,
      0,
      5,
      12,
      2,
      13,
      9,
      7,
      10,
      14,
      12,
      15,
      10,
      4,
      1,
      5,
      8,
      7,
      6,
      2,
      13,
      14,
      0,
      3,
      9,
      11
    ];
    var s = [
      11,
      14,
      15,
      12,
      5,
      8,
      7,
      9,
      11,
      13,
      14,
      15,
      6,
      7,
      9,
      8,
      7,
      6,
      8,
      13,
      11,
      9,
      7,
      15,
      7,
      12,
      15,
      9,
      11,
      7,
      13,
      12,
      11,
      13,
      6,
      7,
      14,
      9,
      13,
      15,
      14,
      8,
      13,
      6,
      5,
      12,
      7,
      5,
      11,
      12,
      14,
      15,
      14,
      15,
      9,
      8,
      9,
      14,
      5,
      6,
      8,
      6,
      5,
      12,
      9,
      15,
      5,
      11,
      6,
      8,
      13,
      12,
      5,
      12,
      13,
      14,
      11,
      8,
      5,
      6
    ];
    var sh = [
      8,
      9,
      9,
      11,
      13,
      15,
      15,
      5,
      7,
      7,
      8,
      11,
      14,
      14,
      12,
      6,
      9,
      13,
      15,
      7,
      12,
      8,
      9,
      11,
      7,
      7,
      12,
      7,
      6,
      15,
      13,
      11,
      9,
      7,
      15,
      11,
      8,
      6,
      6,
      14,
      12,
      13,
      5,
      14,
      13,
      13,
      7,
      5,
      15,
      5,
      8,
      11,
      14,
      14,
      6,
      14,
      6,
      9,
      12,
      9,
      12,
      5,
      15,
      8,
      8,
      5,
      12,
      9,
      12,
      5,
      14,
      6,
      8,
      13,
      6,
      5,
      15,
      13,
      11,
      11
    ];
  }
});

// ../../node_modules/hash.js/lib/hash/hmac.js
var require_hmac = __commonJS({
  "../../node_modules/hash.js/lib/hash/hmac.js"(exports, module) {
    "use strict";
    var utils = require_utils();
    var assert2 = require_minimalistic_assert();
    function Hmac(hash3, key2, enc) {
      if (!(this instanceof Hmac))
        return new Hmac(hash3, key2, enc);
      this.Hash = hash3;
      this.blockSize = hash3.blockSize / 8;
      this.outSize = hash3.outSize / 8;
      this.inner = null;
      this.outer = null;
      this._init(utils.toArray(key2, enc));
    }
    module.exports = Hmac;
    Hmac.prototype._init = function init2(key2) {
      if (key2.length > this.blockSize)
        key2 = new this.Hash().update(key2).digest();
      assert2(key2.length <= this.blockSize);
      for (var i = key2.length; i < this.blockSize; i++)
        key2.push(0);
      for (i = 0; i < key2.length; i++)
        key2[i] ^= 54;
      this.inner = new this.Hash().update(key2);
      for (i = 0; i < key2.length; i++)
        key2[i] ^= 106;
      this.outer = new this.Hash().update(key2);
    };
    Hmac.prototype.update = function update2(msg, enc) {
      this.inner.update(msg, enc);
      return this;
    };
    Hmac.prototype.digest = function digest(enc) {
      this.outer.update(this.inner.digest());
      return this.outer.digest(enc);
    };
  }
});

// ../../node_modules/hash.js/lib/hash.js
var require_hash = __commonJS({
  "../../node_modules/hash.js/lib/hash.js"(exports) {
    "use strict";
    var hash3 = exports;
    hash3.utils = require_utils();
    hash3.common = require_common();
    hash3.sha = require_sha();
    hash3.ripemd = require_ripemd();
    hash3.hmac = require_hmac();
    hash3.sha1 = hash3.sha.sha1;
    hash3.sha256 = hash3.sha.sha256;
    hash3.sha224 = hash3.sha.sha224;
    hash3.sha384 = hash3.sha.sha384;
    hash3.sha512 = hash3.sha.sha512;
    hash3.ripemd160 = hash3.ripemd.ripemd160;
  }
});

// ../../node_modules/@ethersproject/sha2/lib.esm/types.js
var SupportedAlgorithm;
var init_types = __esm({
  "../../node_modules/@ethersproject/sha2/lib.esm/types.js"() {
    "use strict";
    (function(SupportedAlgorithm2) {
      SupportedAlgorithm2["sha256"] = "sha256";
      SupportedAlgorithm2["sha512"] = "sha512";
    })(SupportedAlgorithm || (SupportedAlgorithm = {}));
  }
});

// ../../node_modules/@ethersproject/sha2/lib.esm/_version.js
var version10;
var init_version10 = __esm({
  "../../node_modules/@ethersproject/sha2/lib.esm/_version.js"() {
    "use strict";
    version10 = "sha2/5.8.0";
  }
});

// ../../node_modules/@ethersproject/sha2/lib.esm/sha2.js
function ripemd160(data) {
  return "0x" + import_hash2.default.ripemd160().update(arrayify(data)).digest("hex");
}
function sha256(data) {
  return "0x" + import_hash2.default.sha256().update(arrayify(data)).digest("hex");
}
function sha512(data) {
  return "0x" + import_hash2.default.sha512().update(arrayify(data)).digest("hex");
}
function computeHmac(algorithm, key2, data) {
  if (!SupportedAlgorithm[algorithm]) {
    logger15.throwError("unsupported algorithm " + algorithm, Logger.errors.UNSUPPORTED_OPERATION, {
      operation: "hmac",
      algorithm
    });
  }
  return "0x" + import_hash2.default.hmac(import_hash2.default[algorithm], arrayify(key2)).update(arrayify(data)).digest("hex");
}
var import_hash2, logger15;
var init_sha2 = __esm({
  "../../node_modules/@ethersproject/sha2/lib.esm/sha2.js"() {
    "use strict";
    import_hash2 = __toESM(require_hash());
    init_lib2();
    init_types();
    init_lib();
    init_version10();
    logger15 = new Logger(version10);
  }
});

// ../../node_modules/@ethersproject/sha2/lib.esm/index.js
var lib_exports12 = {};
__export(lib_exports12, {
  SupportedAlgorithm: () => SupportedAlgorithm,
  computeHmac: () => computeHmac,
  ripemd160: () => ripemd160,
  sha256: () => sha256,
  sha512: () => sha512
});
var init_lib15 = __esm({
  "../../node_modules/@ethersproject/sha2/lib.esm/index.js"() {
    "use strict";
    init_sha2();
    init_types();
  }
});

// ../../node_modules/@ethersproject/pbkdf2/lib.esm/pbkdf2.js
function pbkdf2(password, salt, iterations, keylen, hashAlgorithm) {
  password = arrayify(password);
  salt = arrayify(salt);
  let hLen;
  let l = 1;
  const DK = new Uint8Array(keylen);
  const block1 = new Uint8Array(salt.length + 4);
  block1.set(salt);
  let r2;
  let T;
  for (let i = 1; i <= l; i++) {
    block1[salt.length] = i >> 24 & 255;
    block1[salt.length + 1] = i >> 16 & 255;
    block1[salt.length + 2] = i >> 8 & 255;
    block1[salt.length + 3] = i & 255;
    let U = arrayify(computeHmac(hashAlgorithm, password, block1));
    if (!hLen) {
      hLen = U.length;
      T = new Uint8Array(hLen);
      l = Math.ceil(keylen / hLen);
      r2 = keylen - (l - 1) * hLen;
    }
    T.set(U);
    for (let j = 1; j < iterations; j++) {
      U = arrayify(computeHmac(hashAlgorithm, password, U));
      for (let k = 0; k < hLen; k++)
        T[k] ^= U[k];
    }
    const destPos = (i - 1) * hLen;
    const len = i === l ? r2 : hLen;
    DK.set(arrayify(T).slice(0, len), destPos);
  }
  return hexlify(DK);
}
var init_pbkdf2 = __esm({
  "../../node_modules/@ethersproject/pbkdf2/lib.esm/pbkdf2.js"() {
    "use strict";
    init_lib2();
    init_lib15();
  }
});

// ../../node_modules/@ethersproject/pbkdf2/lib.esm/index.js
var init_lib16 = __esm({
  "../../node_modules/@ethersproject/pbkdf2/lib.esm/index.js"() {
    "use strict";
    init_pbkdf2();
  }
});

// ../../node_modules/@ethersproject/signing-key/lib.esm/elliptic.js
function createCommonjsModule(fn, basedir, module) {
  return module = {
    path: basedir,
    exports: {},
    require: function(path, base2) {
      return commonjsRequire(path, base2 === void 0 || base2 === null ? module.path : base2);
    }
  }, fn(module, module.exports), module.exports;
}
function commonjsRequire() {
  throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs");
}
function assert(val, msg) {
  if (!val)
    throw new Error(msg || "Assertion failed");
}
function BaseCurve(type, conf) {
  this.type = type;
  this.p = new import_bn2.default(conf.p, 16);
  this.red = conf.prime ? import_bn2.default.red(conf.prime) : import_bn2.default.mont(this.p);
  this.zero = new import_bn2.default(0).toRed(this.red);
  this.one = new import_bn2.default(1).toRed(this.red);
  this.two = new import_bn2.default(2).toRed(this.red);
  this.n = conf.n && new import_bn2.default(conf.n, 16);
  this.g = conf.g && this.pointFromJSON(conf.g, conf.gRed);
  this._wnafT1 = new Array(4);
  this._wnafT2 = new Array(4);
  this._wnafT3 = new Array(4);
  this._wnafT4 = new Array(4);
  this._bitLength = this.n ? this.n.bitLength() : 0;
  var adjustCount = this.n && this.p.div(this.n);
  if (!adjustCount || adjustCount.cmpn(100) > 0) {
    this.redN = null;
  } else {
    this._maxwellTrick = true;
    this.redN = this.n.toRed(this.red);
  }
}
function BasePoint(curve, type) {
  this.curve = curve;
  this.type = type;
  this.precomputed = null;
}
function ShortCurve(conf) {
  base.call(this, "short", conf);
  this.a = new import_bn2.default(conf.a, 16).toRed(this.red);
  this.b = new import_bn2.default(conf.b, 16).toRed(this.red);
  this.tinv = this.two.redInvm();
  this.zeroA = this.a.fromRed().cmpn(0) === 0;
  this.threeA = this.a.fromRed().sub(this.p).cmpn(-3) === 0;
  this.endo = this._getEndomorphism(conf);
  this._endoWnafT1 = new Array(4);
  this._endoWnafT2 = new Array(4);
}
function Point(curve, x, y, isRed) {
  base.BasePoint.call(this, curve, "affine");
  if (x === null && y === null) {
    this.x = null;
    this.y = null;
    this.inf = true;
  } else {
    this.x = new import_bn2.default(x, 16);
    this.y = new import_bn2.default(y, 16);
    if (isRed) {
      this.x.forceRed(this.curve.red);
      this.y.forceRed(this.curve.red);
    }
    if (!this.x.red)
      this.x = this.x.toRed(this.curve.red);
    if (!this.y.red)
      this.y = this.y.toRed(this.curve.red);
    this.inf = false;
  }
}
function JPoint(curve, x, y, z) {
  base.BasePoint.call(this, curve, "jacobian");
  if (x === null && y === null && z === null) {
    this.x = this.curve.one;
    this.y = this.curve.one;
    this.z = new import_bn2.default(0);
  } else {
    this.x = new import_bn2.default(x, 16);
    this.y = new import_bn2.default(y, 16);
    this.z = new import_bn2.default(z, 16);
  }
  if (!this.x.red)
    this.x = this.x.toRed(this.curve.red);
  if (!this.y.red)
    this.y = this.y.toRed(this.curve.red);
  if (!this.z.red)
    this.z = this.z.toRed(this.curve.red);
  this.zOne = this.z === this.curve.one;
}
function HmacDRBG(options) {
  if (!(this instanceof HmacDRBG))
    return new HmacDRBG(options);
  this.hash = options.hash;
  this.predResist = !!options.predResist;
  this.outLen = this.hash.outSize;
  this.minEntropy = options.minEntropy || this.hash.hmacStrength;
  this._reseed = null;
  this.reseedInterval = null;
  this.K = null;
  this.V = null;
  var entropy = utils_1.toArray(options.entropy, options.entropyEnc || "hex");
  var nonce = utils_1.toArray(options.nonce, options.nonceEnc || "hex");
  var pers = utils_1.toArray(options.pers, options.persEnc || "hex");
  minimalisticAssert(
    entropy.length >= this.minEntropy / 8,
    "Not enough entropy. Minimum is: " + this.minEntropy + " bits"
  );
  this._init(entropy, nonce, pers);
}
function KeyPair(ec2, options) {
  this.ec = ec2;
  this.priv = null;
  this.pub = null;
  if (options.priv)
    this._importPrivate(options.priv, options.privEnc);
  if (options.pub)
    this._importPublic(options.pub, options.pubEnc);
}
function Signature(options, enc) {
  if (options instanceof Signature)
    return options;
  if (this._importDER(options, enc))
    return;
  assert$4(options.r && options.s, "Signature without r or s");
  this.r = new import_bn2.default(options.r, 16);
  this.s = new import_bn2.default(options.s, 16);
  if (options.recoveryParam === void 0)
    this.recoveryParam = null;
  else
    this.recoveryParam = options.recoveryParam;
}
function Position() {
  this.place = 0;
}
function getLength(buf, p) {
  var initial = buf[p.place++];
  if (!(initial & 128)) {
    return initial;
  }
  var octetLen = initial & 15;
  if (octetLen === 0 || octetLen > 4) {
    return false;
  }
  if (buf[p.place] === 0) {
    return false;
  }
  var val = 0;
  for (var i = 0, off = p.place; i < octetLen; i++, off++) {
    val <<= 8;
    val |= buf[off];
    val >>>= 0;
  }
  if (val <= 127) {
    return false;
  }
  p.place = off;
  return val;
}
function rmPadding(buf) {
  var i = 0;
  var len = buf.length - 1;
  while (!buf[i] && !(buf[i + 1] & 128) && i < len) {
    i++;
  }
  if (i === 0) {
    return buf;
  }
  return buf.slice(i);
}
function constructLength(arr, len) {
  if (len < 128) {
    arr.push(len);
    return;
  }
  var octets = 1 + (Math.log(len) / Math.LN2 >>> 3);
  arr.push(octets | 128);
  while (--octets) {
    arr.push(len >>> (octets << 3) & 255);
  }
  arr.push(len);
}
function EC(options) {
  if (!(this instanceof EC))
    return new EC(options);
  if (typeof options === "string") {
    assert$5(
      Object.prototype.hasOwnProperty.call(curves_1, options),
      "Unknown curve " + options
    );
    options = curves_1[options];
  }
  if (options instanceof curves_1.PresetCurve)
    options = { curve: options };
  this.curve = options.curve.curve;
  this.n = this.curve.n;
  this.nh = this.n.ushrn(1);
  this.g = this.curve.g;
  this.g = options.curve.g;
  this.g.precompute(options.curve.n.bitLength() + 1);
  this.hash = options.hash || options.curve.hash;
}
var import_bn2, import_hash3, minimalisticAssert, utils_1, utils_1$1, getNAF, getJSF, assert$1, base, inherits_browser, assert$2, short_1, curve_1, curves_1, hmacDrbg, assert$3, key, assert$4, signature, rand, assert$5, ec, elliptic_1, EC$1;
var init_elliptic = __esm({
  "../../node_modules/@ethersproject/signing-key/lib.esm/elliptic.js"() {
    "use strict";
    import_bn2 = __toESM(require_bn());
    import_hash3 = __toESM(require_hash());
    minimalisticAssert = assert;
    assert.equal = function assertEqual(l, r2, msg) {
      if (l != r2)
        throw new Error(msg || "Assertion failed: " + l + " != " + r2);
    };
    utils_1 = createCommonjsModule(function(module, exports) {
      "use strict";
      var utils = exports;
      function toArray(msg, enc) {
        if (Array.isArray(msg))
          return msg.slice();
        if (!msg)
          return [];
        var res = [];
        if (typeof msg !== "string") {
          for (var i = 0; i < msg.length; i++)
            res[i] = msg[i] | 0;
          return res;
        }
        if (enc === "hex") {
          msg = msg.replace(/[^a-z0-9]+/ig, "");
          if (msg.length % 2 !== 0)
            msg = "0" + msg;
          for (var i = 0; i < msg.length; i += 2)
            res.push(parseInt(msg[i] + msg[i + 1], 16));
        } else {
          for (var i = 0; i < msg.length; i++) {
            var c = msg.charCodeAt(i);
            var hi = c >> 8;
            var lo = c & 255;
            if (hi)
              res.push(hi, lo);
            else
              res.push(lo);
          }
        }
        return res;
      }
      utils.toArray = toArray;
      function zero2(word) {
        if (word.length === 1)
          return "0" + word;
        else
          return word;
      }
      utils.zero2 = zero2;
      function toHex2(msg) {
        var res = "";
        for (var i = 0; i < msg.length; i++)
          res += zero2(msg[i].toString(16));
        return res;
      }
      utils.toHex = toHex2;
      utils.encode = function encode4(arr, enc) {
        if (enc === "hex")
          return toHex2(arr);
        else
          return arr;
      };
    });
    utils_1$1 = createCommonjsModule(function(module, exports) {
      "use strict";
      var utils = exports;
      utils.assert = minimalisticAssert;
      utils.toArray = utils_1.toArray;
      utils.zero2 = utils_1.zero2;
      utils.toHex = utils_1.toHex;
      utils.encode = utils_1.encode;
      function getNAF2(num, w, bits) {
        var naf = new Array(Math.max(num.bitLength(), bits) + 1);
        var i;
        for (i = 0; i < naf.length; i += 1) {
          naf[i] = 0;
        }
        var ws = 1 << w + 1;
        var k = num.clone();
        for (i = 0; i < naf.length; i++) {
          var z;
          var mod = k.andln(ws - 1);
          if (k.isOdd()) {
            if (mod > (ws >> 1) - 1)
              z = (ws >> 1) - mod;
            else
              z = mod;
            k.isubn(z);
          } else {
            z = 0;
          }
          naf[i] = z;
          k.iushrn(1);
        }
        return naf;
      }
      utils.getNAF = getNAF2;
      function getJSF2(k1, k2) {
        var jsf = [
          [],
          []
        ];
        k1 = k1.clone();
        k2 = k2.clone();
        var d1 = 0;
        var d2 = 0;
        var m8;
        while (k1.cmpn(-d1) > 0 || k2.cmpn(-d2) > 0) {
          var m14 = k1.andln(3) + d1 & 3;
          var m24 = k2.andln(3) + d2 & 3;
          if (m14 === 3)
            m14 = -1;
          if (m24 === 3)
            m24 = -1;
          var u1;
          if ((m14 & 1) === 0) {
            u1 = 0;
          } else {
            m8 = k1.andln(7) + d1 & 7;
            if ((m8 === 3 || m8 === 5) && m24 === 2)
              u1 = -m14;
            else
              u1 = m14;
          }
          jsf[0].push(u1);
          var u2;
          if ((m24 & 1) === 0) {
            u2 = 0;
          } else {
            m8 = k2.andln(7) + d2 & 7;
            if ((m8 === 3 || m8 === 5) && m14 === 2)
              u2 = -m24;
            else
              u2 = m24;
          }
          jsf[1].push(u2);
          if (2 * d1 === u1 + 1)
            d1 = 1 - d1;
          if (2 * d2 === u2 + 1)
            d2 = 1 - d2;
          k1.iushrn(1);
          k2.iushrn(1);
        }
        return jsf;
      }
      utils.getJSF = getJSF2;
      function cachedProperty(obj, name, computer) {
        var key2 = "_" + name;
        obj.prototype[name] = function cachedProperty2() {
          return this[key2] !== void 0 ? this[key2] : this[key2] = computer.call(this);
        };
      }
      utils.cachedProperty = cachedProperty;
      function parseBytes(bytes) {
        return typeof bytes === "string" ? utils.toArray(bytes, "hex") : bytes;
      }
      utils.parseBytes = parseBytes;
      function intFromLE(bytes) {
        return new import_bn2.default(bytes, "hex", "le");
      }
      utils.intFromLE = intFromLE;
    });
    getNAF = utils_1$1.getNAF;
    getJSF = utils_1$1.getJSF;
    assert$1 = utils_1$1.assert;
    base = BaseCurve;
    BaseCurve.prototype.point = function point() {
      throw new Error("Not implemented");
    };
    BaseCurve.prototype.validate = function validate() {
      throw new Error("Not implemented");
    };
    BaseCurve.prototype._fixedNafMul = function _fixedNafMul(p, k) {
      assert$1(p.precomputed);
      var doubles = p._getDoubles();
      var naf = getNAF(k, 1, this._bitLength);
      var I = (1 << doubles.step + 1) - (doubles.step % 2 === 0 ? 2 : 1);
      I /= 3;
      var repr = [];
      var j;
      var nafW;
      for (j = 0; j < naf.length; j += doubles.step) {
        nafW = 0;
        for (var l = j + doubles.step - 1; l >= j; l--)
          nafW = (nafW << 1) + naf[l];
        repr.push(nafW);
      }
      var a = this.jpoint(null, null, null);
      var b = this.jpoint(null, null, null);
      for (var i = I; i > 0; i--) {
        for (j = 0; j < repr.length; j++) {
          nafW = repr[j];
          if (nafW === i)
            b = b.mixedAdd(doubles.points[j]);
          else if (nafW === -i)
            b = b.mixedAdd(doubles.points[j].neg());
        }
        a = a.add(b);
      }
      return a.toP();
    };
    BaseCurve.prototype._wnafMul = function _wnafMul(p, k) {
      var w = 4;
      var nafPoints = p._getNAFPoints(w);
      w = nafPoints.wnd;
      var wnd = nafPoints.points;
      var naf = getNAF(k, w, this._bitLength);
      var acc = this.jpoint(null, null, null);
      for (var i = naf.length - 1; i >= 0; i--) {
        for (var l = 0; i >= 0 && naf[i] === 0; i--)
          l++;
        if (i >= 0)
          l++;
        acc = acc.dblp(l);
        if (i < 0)
          break;
        var z = naf[i];
        assert$1(z !== 0);
        if (p.type === "affine") {
          if (z > 0)
            acc = acc.mixedAdd(wnd[z - 1 >> 1]);
          else
            acc = acc.mixedAdd(wnd[-z - 1 >> 1].neg());
        } else {
          if (z > 0)
            acc = acc.add(wnd[z - 1 >> 1]);
          else
            acc = acc.add(wnd[-z - 1 >> 1].neg());
        }
      }
      return p.type === "affine" ? acc.toP() : acc;
    };
    BaseCurve.prototype._wnafMulAdd = function _wnafMulAdd(defW, points, coeffs, len, jacobianResult) {
      var wndWidth = this._wnafT1;
      var wnd = this._wnafT2;
      var naf = this._wnafT3;
      var max = 0;
      var i;
      var j;
      var p;
      for (i = 0; i < len; i++) {
        p = points[i];
        var nafPoints = p._getNAFPoints(defW);
        wndWidth[i] = nafPoints.wnd;
        wnd[i] = nafPoints.points;
      }
      for (i = len - 1; i >= 1; i -= 2) {
        var a = i - 1;
        var b = i;
        if (wndWidth[a] !== 1 || wndWidth[b] !== 1) {
          naf[a] = getNAF(coeffs[a], wndWidth[a], this._bitLength);
          naf[b] = getNAF(coeffs[b], wndWidth[b], this._bitLength);
          max = Math.max(naf[a].length, max);
          max = Math.max(naf[b].length, max);
          continue;
        }
        var comb = [
          points[a],
          /* 1 */
          null,
          /* 3 */
          null,
          /* 5 */
          points[b]
          /* 7 */
        ];
        if (points[a].y.cmp(points[b].y) === 0) {
          comb[1] = points[a].add(points[b]);
          comb[2] = points[a].toJ().mixedAdd(points[b].neg());
        } else if (points[a].y.cmp(points[b].y.redNeg()) === 0) {
          comb[1] = points[a].toJ().mixedAdd(points[b]);
          comb[2] = points[a].add(points[b].neg());
        } else {
          comb[1] = points[a].toJ().mixedAdd(points[b]);
          comb[2] = points[a].toJ().mixedAdd(points[b].neg());
        }
        var index = [
          -3,
          /* -1 -1 */
          -1,
          /* -1 0 */
          -5,
          /* -1 1 */
          -7,
          /* 0 -1 */
          0,
          /* 0 0 */
          7,
          /* 0 1 */
          5,
          /* 1 -1 */
          1,
          /* 1 0 */
          3
          /* 1 1 */
        ];
        var jsf = getJSF(coeffs[a], coeffs[b]);
        max = Math.max(jsf[0].length, max);
        naf[a] = new Array(max);
        naf[b] = new Array(max);
        for (j = 0; j < max; j++) {
          var ja = jsf[0][j] | 0;
          var jb = jsf[1][j] | 0;
          naf[a][j] = index[(ja + 1) * 3 + (jb + 1)];
          naf[b][j] = 0;
          wnd[a] = comb;
        }
      }
      var acc = this.jpoint(null, null, null);
      var tmp = this._wnafT4;
      for (i = max; i >= 0; i--) {
        var k = 0;
        while (i >= 0) {
          var zero = true;
          for (j = 0; j < len; j++) {
            tmp[j] = naf[j][i] | 0;
            if (tmp[j] !== 0)
              zero = false;
          }
          if (!zero)
            break;
          k++;
          i--;
        }
        if (i >= 0)
          k++;
        acc = acc.dblp(k);
        if (i < 0)
          break;
        for (j = 0; j < len; j++) {
          var z = tmp[j];
          p;
          if (z === 0)
            continue;
          else if (z > 0)
            p = wnd[j][z - 1 >> 1];
          else if (z < 0)
            p = wnd[j][-z - 1 >> 1].neg();
          if (p.type === "affine")
            acc = acc.mixedAdd(p);
          else
            acc = acc.add(p);
        }
      }
      for (i = 0; i < len; i++)
        wnd[i] = null;
      if (jacobianResult)
        return acc;
      else
        return acc.toP();
    };
    BaseCurve.BasePoint = BasePoint;
    BasePoint.prototype.eq = function eq() {
      throw new Error("Not implemented");
    };
    BasePoint.prototype.validate = function validate2() {
      return this.curve.validate(this);
    };
    BaseCurve.prototype.decodePoint = function decodePoint(bytes, enc) {
      bytes = utils_1$1.toArray(bytes, enc);
      var len = this.p.byteLength();
      if ((bytes[0] === 4 || bytes[0] === 6 || bytes[0] === 7) && bytes.length - 1 === 2 * len) {
        if (bytes[0] === 6)
          assert$1(bytes[bytes.length - 1] % 2 === 0);
        else if (bytes[0] === 7)
          assert$1(bytes[bytes.length - 1] % 2 === 1);
        var res = this.point(
          bytes.slice(1, 1 + len),
          bytes.slice(1 + len, 1 + 2 * len)
        );
        return res;
      } else if ((bytes[0] === 2 || bytes[0] === 3) && bytes.length - 1 === len) {
        return this.pointFromX(bytes.slice(1, 1 + len), bytes[0] === 3);
      }
      throw new Error("Unknown point format");
    };
    BasePoint.prototype.encodeCompressed = function encodeCompressed(enc) {
      return this.encode(enc, true);
    };
    BasePoint.prototype._encode = function _encode2(compact) {
      var len = this.curve.p.byteLength();
      var x = this.getX().toArray("be", len);
      if (compact)
        return [this.getY().isEven() ? 2 : 3].concat(x);
      return [4].concat(x, this.getY().toArray("be", len));
    };
    BasePoint.prototype.encode = function encode3(enc, compact) {
      return utils_1$1.encode(this._encode(compact), enc);
    };
    BasePoint.prototype.precompute = function precompute(power) {
      if (this.precomputed)
        return this;
      var precomputed = {
        doubles: null,
        naf: null,
        beta: null
      };
      precomputed.naf = this._getNAFPoints(8);
      precomputed.doubles = this._getDoubles(4, power);
      precomputed.beta = this._getBeta();
      this.precomputed = precomputed;
      return this;
    };
    BasePoint.prototype._hasDoubles = function _hasDoubles(k) {
      if (!this.precomputed)
        return false;
      var doubles = this.precomputed.doubles;
      if (!doubles)
        return false;
      return doubles.points.length >= Math.ceil((k.bitLength() + 1) / doubles.step);
    };
    BasePoint.prototype._getDoubles = function _getDoubles(step, power) {
      if (this.precomputed && this.precomputed.doubles)
        return this.precomputed.doubles;
      var doubles = [this];
      var acc = this;
      for (var i = 0; i < power; i += step) {
        for (var j = 0; j < step; j++)
          acc = acc.dbl();
        doubles.push(acc);
      }
      return {
        step,
        points: doubles
      };
    };
    BasePoint.prototype._getNAFPoints = function _getNAFPoints(wnd) {
      if (this.precomputed && this.precomputed.naf)
        return this.precomputed.naf;
      var res = [this];
      var max = (1 << wnd) - 1;
      var dbl3 = max === 1 ? null : this.dbl();
      for (var i = 1; i < max; i++)
        res[i] = res[i - 1].add(dbl3);
      return {
        wnd,
        points: res
      };
    };
    BasePoint.prototype._getBeta = function _getBeta() {
      return null;
    };
    BasePoint.prototype.dblp = function dblp(k) {
      var r2 = this;
      for (var i = 0; i < k; i++)
        r2 = r2.dbl();
      return r2;
    };
    inherits_browser = createCommonjsModule(function(module) {
      if (typeof Object.create === "function") {
        module.exports = function inherits(ctor, superCtor) {
          if (superCtor) {
            ctor.super_ = superCtor;
            ctor.prototype = Object.create(superCtor.prototype, {
              constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
              }
            });
          }
        };
      } else {
        module.exports = function inherits(ctor, superCtor) {
          if (superCtor) {
            ctor.super_ = superCtor;
            var TempCtor = function() {
            };
            TempCtor.prototype = superCtor.prototype;
            ctor.prototype = new TempCtor();
            ctor.prototype.constructor = ctor;
          }
        };
      }
    });
    assert$2 = utils_1$1.assert;
    inherits_browser(ShortCurve, base);
    short_1 = ShortCurve;
    ShortCurve.prototype._getEndomorphism = function _getEndomorphism(conf) {
      if (!this.zeroA || !this.g || !this.n || this.p.modn(3) !== 1)
        return;
      var beta;
      var lambda;
      if (conf.beta) {
        beta = new import_bn2.default(conf.beta, 16).toRed(this.red);
      } else {
        var betas = this._getEndoRoots(this.p);
        beta = betas[0].cmp(betas[1]) < 0 ? betas[0] : betas[1];
        beta = beta.toRed(this.red);
      }
      if (conf.lambda) {
        lambda = new import_bn2.default(conf.lambda, 16);
      } else {
        var lambdas = this._getEndoRoots(this.n);
        if (this.g.mul(lambdas[0]).x.cmp(this.g.x.redMul(beta)) === 0) {
          lambda = lambdas[0];
        } else {
          lambda = lambdas[1];
          assert$2(this.g.mul(lambda).x.cmp(this.g.x.redMul(beta)) === 0);
        }
      }
      var basis;
      if (conf.basis) {
        basis = conf.basis.map(function(vec) {
          return {
            a: new import_bn2.default(vec.a, 16),
            b: new import_bn2.default(vec.b, 16)
          };
        });
      } else {
        basis = this._getEndoBasis(lambda);
      }
      return {
        beta,
        lambda,
        basis
      };
    };
    ShortCurve.prototype._getEndoRoots = function _getEndoRoots(num) {
      var red = num === this.p ? this.red : import_bn2.default.mont(num);
      var tinv = new import_bn2.default(2).toRed(red).redInvm();
      var ntinv = tinv.redNeg();
      var s = new import_bn2.default(3).toRed(red).redNeg().redSqrt().redMul(tinv);
      var l1 = ntinv.redAdd(s).fromRed();
      var l2 = ntinv.redSub(s).fromRed();
      return [l1, l2];
    };
    ShortCurve.prototype._getEndoBasis = function _getEndoBasis(lambda) {
      var aprxSqrt = this.n.ushrn(Math.floor(this.n.bitLength() / 2));
      var u = lambda;
      var v = this.n.clone();
      var x1 = new import_bn2.default(1);
      var y1 = new import_bn2.default(0);
      var x2 = new import_bn2.default(0);
      var y2 = new import_bn2.default(1);
      var a0;
      var b0;
      var a1;
      var b1;
      var a2;
      var b2;
      var prevR;
      var i = 0;
      var r2;
      var x;
      while (u.cmpn(0) !== 0) {
        var q = v.div(u);
        r2 = v.sub(q.mul(u));
        x = x2.sub(q.mul(x1));
        var y = y2.sub(q.mul(y1));
        if (!a1 && r2.cmp(aprxSqrt) < 0) {
          a0 = prevR.neg();
          b0 = x1;
          a1 = r2.neg();
          b1 = x;
        } else if (a1 && ++i === 2) {
          break;
        }
        prevR = r2;
        v = u;
        u = r2;
        x2 = x1;
        x1 = x;
        y2 = y1;
        y1 = y;
      }
      a2 = r2.neg();
      b2 = x;
      var len1 = a1.sqr().add(b1.sqr());
      var len2 = a2.sqr().add(b2.sqr());
      if (len2.cmp(len1) >= 0) {
        a2 = a0;
        b2 = b0;
      }
      if (a1.negative) {
        a1 = a1.neg();
        b1 = b1.neg();
      }
      if (a2.negative) {
        a2 = a2.neg();
        b2 = b2.neg();
      }
      return [
        { a: a1, b: b1 },
        { a: a2, b: b2 }
      ];
    };
    ShortCurve.prototype._endoSplit = function _endoSplit(k) {
      var basis = this.endo.basis;
      var v1 = basis[0];
      var v2 = basis[1];
      var c1 = v2.b.mul(k).divRound(this.n);
      var c2 = v1.b.neg().mul(k).divRound(this.n);
      var p1 = c1.mul(v1.a);
      var p2 = c2.mul(v2.a);
      var q1 = c1.mul(v1.b);
      var q2 = c2.mul(v2.b);
      var k1 = k.sub(p1).sub(p2);
      var k2 = q1.add(q2).neg();
      return { k1, k2 };
    };
    ShortCurve.prototype.pointFromX = function pointFromX(x, odd) {
      x = new import_bn2.default(x, 16);
      if (!x.red)
        x = x.toRed(this.red);
      var y2 = x.redSqr().redMul(x).redIAdd(x.redMul(this.a)).redIAdd(this.b);
      var y = y2.redSqrt();
      if (y.redSqr().redSub(y2).cmp(this.zero) !== 0)
        throw new Error("invalid point");
      var isOdd = y.fromRed().isOdd();
      if (odd && !isOdd || !odd && isOdd)
        y = y.redNeg();
      return this.point(x, y);
    };
    ShortCurve.prototype.validate = function validate3(point3) {
      if (point3.inf)
        return true;
      var x = point3.x;
      var y = point3.y;
      var ax = this.a.redMul(x);
      var rhs = x.redSqr().redMul(x).redIAdd(ax).redIAdd(this.b);
      return y.redSqr().redISub(rhs).cmpn(0) === 0;
    };
    ShortCurve.prototype._endoWnafMulAdd = function _endoWnafMulAdd(points, coeffs, jacobianResult) {
      var npoints = this._endoWnafT1;
      var ncoeffs = this._endoWnafT2;
      for (var i = 0; i < points.length; i++) {
        var split = this._endoSplit(coeffs[i]);
        var p = points[i];
        var beta = p._getBeta();
        if (split.k1.negative) {
          split.k1.ineg();
          p = p.neg(true);
        }
        if (split.k2.negative) {
          split.k2.ineg();
          beta = beta.neg(true);
        }
        npoints[i * 2] = p;
        npoints[i * 2 + 1] = beta;
        ncoeffs[i * 2] = split.k1;
        ncoeffs[i * 2 + 1] = split.k2;
      }
      var res = this._wnafMulAdd(1, npoints, ncoeffs, i * 2, jacobianResult);
      for (var j = 0; j < i * 2; j++) {
        npoints[j] = null;
        ncoeffs[j] = null;
      }
      return res;
    };
    inherits_browser(Point, base.BasePoint);
    ShortCurve.prototype.point = function point2(x, y, isRed) {
      return new Point(this, x, y, isRed);
    };
    ShortCurve.prototype.pointFromJSON = function pointFromJSON(obj, red) {
      return Point.fromJSON(this, obj, red);
    };
    Point.prototype._getBeta = function _getBeta2() {
      if (!this.curve.endo)
        return;
      var pre = this.precomputed;
      if (pre && pre.beta)
        return pre.beta;
      var beta = this.curve.point(this.x.redMul(this.curve.endo.beta), this.y);
      if (pre) {
        var curve = this.curve;
        var endoMul = function(p) {
          return curve.point(p.x.redMul(curve.endo.beta), p.y);
        };
        pre.beta = beta;
        beta.precomputed = {
          beta: null,
          naf: pre.naf && {
            wnd: pre.naf.wnd,
            points: pre.naf.points.map(endoMul)
          },
          doubles: pre.doubles && {
            step: pre.doubles.step,
            points: pre.doubles.points.map(endoMul)
          }
        };
      }
      return beta;
    };
    Point.prototype.toJSON = function toJSON() {
      if (!this.precomputed)
        return [this.x, this.y];
      return [this.x, this.y, this.precomputed && {
        doubles: this.precomputed.doubles && {
          step: this.precomputed.doubles.step,
          points: this.precomputed.doubles.points.slice(1)
        },
        naf: this.precomputed.naf && {
          wnd: this.precomputed.naf.wnd,
          points: this.precomputed.naf.points.slice(1)
        }
      }];
    };
    Point.fromJSON = function fromJSON(curve, obj, red) {
      if (typeof obj === "string")
        obj = JSON.parse(obj);
      var res = curve.point(obj[0], obj[1], red);
      if (!obj[2])
        return res;
      function obj2point(obj2) {
        return curve.point(obj2[0], obj2[1], red);
      }
      var pre = obj[2];
      res.precomputed = {
        beta: null,
        doubles: pre.doubles && {
          step: pre.doubles.step,
          points: [res].concat(pre.doubles.points.map(obj2point))
        },
        naf: pre.naf && {
          wnd: pre.naf.wnd,
          points: [res].concat(pre.naf.points.map(obj2point))
        }
      };
      return res;
    };
    Point.prototype.inspect = function inspect() {
      if (this.isInfinity())
        return "<EC Point Infinity>";
      return "<EC Point x: " + this.x.fromRed().toString(16, 2) + " y: " + this.y.fromRed().toString(16, 2) + ">";
    };
    Point.prototype.isInfinity = function isInfinity() {
      return this.inf;
    };
    Point.prototype.add = function add(p) {
      if (this.inf)
        return p;
      if (p.inf)
        return this;
      if (this.eq(p))
        return this.dbl();
      if (this.neg().eq(p))
        return this.curve.point(null, null);
      if (this.x.cmp(p.x) === 0)
        return this.curve.point(null, null);
      var c = this.y.redSub(p.y);
      if (c.cmpn(0) !== 0)
        c = c.redMul(this.x.redSub(p.x).redInvm());
      var nx = c.redSqr().redISub(this.x).redISub(p.x);
      var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
      return this.curve.point(nx, ny);
    };
    Point.prototype.dbl = function dbl() {
      if (this.inf)
        return this;
      var ys1 = this.y.redAdd(this.y);
      if (ys1.cmpn(0) === 0)
        return this.curve.point(null, null);
      var a = this.curve.a;
      var x2 = this.x.redSqr();
      var dyinv = ys1.redInvm();
      var c = x2.redAdd(x2).redIAdd(x2).redIAdd(a).redMul(dyinv);
      var nx = c.redSqr().redISub(this.x.redAdd(this.x));
      var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
      return this.curve.point(nx, ny);
    };
    Point.prototype.getX = function getX() {
      return this.x.fromRed();
    };
    Point.prototype.getY = function getY() {
      return this.y.fromRed();
    };
    Point.prototype.mul = function mul(k) {
      k = new import_bn2.default(k, 16);
      if (this.isInfinity())
        return this;
      else if (this._hasDoubles(k))
        return this.curve._fixedNafMul(this, k);
      else if (this.curve.endo)
        return this.curve._endoWnafMulAdd([this], [k]);
      else
        return this.curve._wnafMul(this, k);
    };
    Point.prototype.mulAdd = function mulAdd(k1, p2, k2) {
      var points = [this, p2];
      var coeffs = [k1, k2];
      if (this.curve.endo)
        return this.curve._endoWnafMulAdd(points, coeffs);
      else
        return this.curve._wnafMulAdd(1, points, coeffs, 2);
    };
    Point.prototype.jmulAdd = function jmulAdd(k1, p2, k2) {
      var points = [this, p2];
      var coeffs = [k1, k2];
      if (this.curve.endo)
        return this.curve._endoWnafMulAdd(points, coeffs, true);
      else
        return this.curve._wnafMulAdd(1, points, coeffs, 2, true);
    };
    Point.prototype.eq = function eq2(p) {
      return this === p || this.inf === p.inf && (this.inf || this.x.cmp(p.x) === 0 && this.y.cmp(p.y) === 0);
    };
    Point.prototype.neg = function neg(_precompute) {
      if (this.inf)
        return this;
      var res = this.curve.point(this.x, this.y.redNeg());
      if (_precompute && this.precomputed) {
        var pre = this.precomputed;
        var negate = function(p) {
          return p.neg();
        };
        res.precomputed = {
          naf: pre.naf && {
            wnd: pre.naf.wnd,
            points: pre.naf.points.map(negate)
          },
          doubles: pre.doubles && {
            step: pre.doubles.step,
            points: pre.doubles.points.map(negate)
          }
        };
      }
      return res;
    };
    Point.prototype.toJ = function toJ() {
      if (this.inf)
        return this.curve.jpoint(null, null, null);
      var res = this.curve.jpoint(this.x, this.y, this.curve.one);
      return res;
    };
    inherits_browser(JPoint, base.BasePoint);
    ShortCurve.prototype.jpoint = function jpoint(x, y, z) {
      return new JPoint(this, x, y, z);
    };
    JPoint.prototype.toP = function toP() {
      if (this.isInfinity())
        return this.curve.point(null, null);
      var zinv = this.z.redInvm();
      var zinv2 = zinv.redSqr();
      var ax = this.x.redMul(zinv2);
      var ay = this.y.redMul(zinv2).redMul(zinv);
      return this.curve.point(ax, ay);
    };
    JPoint.prototype.neg = function neg2() {
      return this.curve.jpoint(this.x, this.y.redNeg(), this.z);
    };
    JPoint.prototype.add = function add2(p) {
      if (this.isInfinity())
        return p;
      if (p.isInfinity())
        return this;
      var pz2 = p.z.redSqr();
      var z2 = this.z.redSqr();
      var u1 = this.x.redMul(pz2);
      var u2 = p.x.redMul(z2);
      var s1 = this.y.redMul(pz2.redMul(p.z));
      var s2 = p.y.redMul(z2.redMul(this.z));
      var h = u1.redSub(u2);
      var r2 = s1.redSub(s2);
      if (h.cmpn(0) === 0) {
        if (r2.cmpn(0) !== 0)
          return this.curve.jpoint(null, null, null);
        else
          return this.dbl();
      }
      var h2 = h.redSqr();
      var h3 = h2.redMul(h);
      var v = u1.redMul(h2);
      var nx = r2.redSqr().redIAdd(h3).redISub(v).redISub(v);
      var ny = r2.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
      var nz = this.z.redMul(p.z).redMul(h);
      return this.curve.jpoint(nx, ny, nz);
    };
    JPoint.prototype.mixedAdd = function mixedAdd(p) {
      if (this.isInfinity())
        return p.toJ();
      if (p.isInfinity())
        return this;
      var z2 = this.z.redSqr();
      var u1 = this.x;
      var u2 = p.x.redMul(z2);
      var s1 = this.y;
      var s2 = p.y.redMul(z2).redMul(this.z);
      var h = u1.redSub(u2);
      var r2 = s1.redSub(s2);
      if (h.cmpn(0) === 0) {
        if (r2.cmpn(0) !== 0)
          return this.curve.jpoint(null, null, null);
        else
          return this.dbl();
      }
      var h2 = h.redSqr();
      var h3 = h2.redMul(h);
      var v = u1.redMul(h2);
      var nx = r2.redSqr().redIAdd(h3).redISub(v).redISub(v);
      var ny = r2.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
      var nz = this.z.redMul(h);
      return this.curve.jpoint(nx, ny, nz);
    };
    JPoint.prototype.dblp = function dblp2(pow) {
      if (pow === 0)
        return this;
      if (this.isInfinity())
        return this;
      if (!pow)
        return this.dbl();
      var i;
      if (this.curve.zeroA || this.curve.threeA) {
        var r2 = this;
        for (i = 0; i < pow; i++)
          r2 = r2.dbl();
        return r2;
      }
      var a = this.curve.a;
      var tinv = this.curve.tinv;
      var jx = this.x;
      var jy = this.y;
      var jz = this.z;
      var jz4 = jz.redSqr().redSqr();
      var jyd = jy.redAdd(jy);
      for (i = 0; i < pow; i++) {
        var jx2 = jx.redSqr();
        var jyd2 = jyd.redSqr();
        var jyd4 = jyd2.redSqr();
        var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));
        var t1 = jx.redMul(jyd2);
        var nx = c.redSqr().redISub(t1.redAdd(t1));
        var t2 = t1.redISub(nx);
        var dny = c.redMul(t2);
        dny = dny.redIAdd(dny).redISub(jyd4);
        var nz = jyd.redMul(jz);
        if (i + 1 < pow)
          jz4 = jz4.redMul(jyd4);
        jx = nx;
        jz = nz;
        jyd = dny;
      }
      return this.curve.jpoint(jx, jyd.redMul(tinv), jz);
    };
    JPoint.prototype.dbl = function dbl2() {
      if (this.isInfinity())
        return this;
      if (this.curve.zeroA)
        return this._zeroDbl();
      else if (this.curve.threeA)
        return this._threeDbl();
      else
        return this._dbl();
    };
    JPoint.prototype._zeroDbl = function _zeroDbl() {
      var nx;
      var ny;
      var nz;
      if (this.zOne) {
        var xx = this.x.redSqr();
        var yy = this.y.redSqr();
        var yyyy = yy.redSqr();
        var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
        s = s.redIAdd(s);
        var m = xx.redAdd(xx).redIAdd(xx);
        var t = m.redSqr().redISub(s).redISub(s);
        var yyyy8 = yyyy.redIAdd(yyyy);
        yyyy8 = yyyy8.redIAdd(yyyy8);
        yyyy8 = yyyy8.redIAdd(yyyy8);
        nx = t;
        ny = m.redMul(s.redISub(t)).redISub(yyyy8);
        nz = this.y.redAdd(this.y);
      } else {
        var a = this.x.redSqr();
        var b = this.y.redSqr();
        var c = b.redSqr();
        var d = this.x.redAdd(b).redSqr().redISub(a).redISub(c);
        d = d.redIAdd(d);
        var e = a.redAdd(a).redIAdd(a);
        var f = e.redSqr();
        var c8 = c.redIAdd(c);
        c8 = c8.redIAdd(c8);
        c8 = c8.redIAdd(c8);
        nx = f.redISub(d).redISub(d);
        ny = e.redMul(d.redISub(nx)).redISub(c8);
        nz = this.y.redMul(this.z);
        nz = nz.redIAdd(nz);
      }
      return this.curve.jpoint(nx, ny, nz);
    };
    JPoint.prototype._threeDbl = function _threeDbl() {
      var nx;
      var ny;
      var nz;
      if (this.zOne) {
        var xx = this.x.redSqr();
        var yy = this.y.redSqr();
        var yyyy = yy.redSqr();
        var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
        s = s.redIAdd(s);
        var m = xx.redAdd(xx).redIAdd(xx).redIAdd(this.curve.a);
        var t = m.redSqr().redISub(s).redISub(s);
        nx = t;
        var yyyy8 = yyyy.redIAdd(yyyy);
        yyyy8 = yyyy8.redIAdd(yyyy8);
        yyyy8 = yyyy8.redIAdd(yyyy8);
        ny = m.redMul(s.redISub(t)).redISub(yyyy8);
        nz = this.y.redAdd(this.y);
      } else {
        var delta = this.z.redSqr();
        var gamma = this.y.redSqr();
        var beta = this.x.redMul(gamma);
        var alpha = this.x.redSub(delta).redMul(this.x.redAdd(delta));
        alpha = alpha.redAdd(alpha).redIAdd(alpha);
        var beta4 = beta.redIAdd(beta);
        beta4 = beta4.redIAdd(beta4);
        var beta8 = beta4.redAdd(beta4);
        nx = alpha.redSqr().redISub(beta8);
        nz = this.y.redAdd(this.z).redSqr().redISub(gamma).redISub(delta);
        var ggamma8 = gamma.redSqr();
        ggamma8 = ggamma8.redIAdd(ggamma8);
        ggamma8 = ggamma8.redIAdd(ggamma8);
        ggamma8 = ggamma8.redIAdd(ggamma8);
        ny = alpha.redMul(beta4.redISub(nx)).redISub(ggamma8);
      }
      return this.curve.jpoint(nx, ny, nz);
    };
    JPoint.prototype._dbl = function _dbl() {
      var a = this.curve.a;
      var jx = this.x;
      var jy = this.y;
      var jz = this.z;
      var jz4 = jz.redSqr().redSqr();
      var jx2 = jx.redSqr();
      var jy2 = jy.redSqr();
      var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));
      var jxd4 = jx.redAdd(jx);
      jxd4 = jxd4.redIAdd(jxd4);
      var t1 = jxd4.redMul(jy2);
      var nx = c.redSqr().redISub(t1.redAdd(t1));
      var t2 = t1.redISub(nx);
      var jyd8 = jy2.redSqr();
      jyd8 = jyd8.redIAdd(jyd8);
      jyd8 = jyd8.redIAdd(jyd8);
      jyd8 = jyd8.redIAdd(jyd8);
      var ny = c.redMul(t2).redISub(jyd8);
      var nz = jy.redAdd(jy).redMul(jz);
      return this.curve.jpoint(nx, ny, nz);
    };
    JPoint.prototype.trpl = function trpl() {
      if (!this.curve.zeroA)
        return this.dbl().add(this);
      var xx = this.x.redSqr();
      var yy = this.y.redSqr();
      var zz = this.z.redSqr();
      var yyyy = yy.redSqr();
      var m = xx.redAdd(xx).redIAdd(xx);
      var mm = m.redSqr();
      var e = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
      e = e.redIAdd(e);
      e = e.redAdd(e).redIAdd(e);
      e = e.redISub(mm);
      var ee = e.redSqr();
      var t = yyyy.redIAdd(yyyy);
      t = t.redIAdd(t);
      t = t.redIAdd(t);
      t = t.redIAdd(t);
      var u = m.redIAdd(e).redSqr().redISub(mm).redISub(ee).redISub(t);
      var yyu4 = yy.redMul(u);
      yyu4 = yyu4.redIAdd(yyu4);
      yyu4 = yyu4.redIAdd(yyu4);
      var nx = this.x.redMul(ee).redISub(yyu4);
      nx = nx.redIAdd(nx);
      nx = nx.redIAdd(nx);
      var ny = this.y.redMul(u.redMul(t.redISub(u)).redISub(e.redMul(ee)));
      ny = ny.redIAdd(ny);
      ny = ny.redIAdd(ny);
      ny = ny.redIAdd(ny);
      var nz = this.z.redAdd(e).redSqr().redISub(zz).redISub(ee);
      return this.curve.jpoint(nx, ny, nz);
    };
    JPoint.prototype.mul = function mul2(k, kbase) {
      k = new import_bn2.default(k, kbase);
      return this.curve._wnafMul(this, k);
    };
    JPoint.prototype.eq = function eq3(p) {
      if (p.type === "affine")
        return this.eq(p.toJ());
      if (this === p)
        return true;
      var z2 = this.z.redSqr();
      var pz2 = p.z.redSqr();
      if (this.x.redMul(pz2).redISub(p.x.redMul(z2)).cmpn(0) !== 0)
        return false;
      var z3 = z2.redMul(this.z);
      var pz3 = pz2.redMul(p.z);
      return this.y.redMul(pz3).redISub(p.y.redMul(z3)).cmpn(0) === 0;
    };
    JPoint.prototype.eqXToP = function eqXToP(x) {
      var zs = this.z.redSqr();
      var rx = x.toRed(this.curve.red).redMul(zs);
      if (this.x.cmp(rx) === 0)
        return true;
      var xc = x.clone();
      var t = this.curve.redN.redMul(zs);
      for (; ; ) {
        xc.iadd(this.curve.n);
        if (xc.cmp(this.curve.p) >= 0)
          return false;
        rx.redIAdd(t);
        if (this.x.cmp(rx) === 0)
          return true;
      }
    };
    JPoint.prototype.inspect = function inspect2() {
      if (this.isInfinity())
        return "<EC JPoint Infinity>";
      return "<EC JPoint x: " + this.x.toString(16, 2) + " y: " + this.y.toString(16, 2) + " z: " + this.z.toString(16, 2) + ">";
    };
    JPoint.prototype.isInfinity = function isInfinity2() {
      return this.z.cmpn(0) === 0;
    };
    curve_1 = createCommonjsModule(function(module, exports) {
      "use strict";
      var curve = exports;
      curve.base = base;
      curve.short = short_1;
      curve.mont = /*RicMoo:ethers:require(./mont)*/
      null;
      curve.edwards = /*RicMoo:ethers:require(./edwards)*/
      null;
    });
    curves_1 = createCommonjsModule(function(module, exports) {
      "use strict";
      var curves = exports;
      var assert2 = utils_1$1.assert;
      function PresetCurve(options) {
        if (options.type === "short")
          this.curve = new curve_1.short(options);
        else if (options.type === "edwards")
          this.curve = new curve_1.edwards(options);
        else
          this.curve = new curve_1.mont(options);
        this.g = this.curve.g;
        this.n = this.curve.n;
        this.hash = options.hash;
        assert2(this.g.validate(), "Invalid curve");
        assert2(this.g.mul(this.n).isInfinity(), "Invalid curve, G*N != O");
      }
      curves.PresetCurve = PresetCurve;
      function defineCurve(name, options) {
        Object.defineProperty(curves, name, {
          configurable: true,
          enumerable: true,
          get: function() {
            var curve = new PresetCurve(options);
            Object.defineProperty(curves, name, {
              configurable: true,
              enumerable: true,
              value: curve
            });
            return curve;
          }
        });
      }
      defineCurve("p192", {
        type: "short",
        prime: "p192",
        p: "ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff",
        a: "ffffffff ffffffff ffffffff fffffffe ffffffff fffffffc",
        b: "64210519 e59c80e7 0fa7e9ab 72243049 feb8deec c146b9b1",
        n: "ffffffff ffffffff ffffffff 99def836 146bc9b1 b4d22831",
        hash: import_hash3.default.sha256,
        gRed: false,
        g: [
          "188da80e b03090f6 7cbf20eb 43a18800 f4ff0afd 82ff1012",
          "07192b95 ffc8da78 631011ed 6b24cdd5 73f977a1 1e794811"
        ]
      });
      defineCurve("p224", {
        type: "short",
        prime: "p224",
        p: "ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001",
        a: "ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff fffffffe",
        b: "b4050a85 0c04b3ab f5413256 5044b0b7 d7bfd8ba 270b3943 2355ffb4",
        n: "ffffffff ffffffff ffffffff ffff16a2 e0b8f03e 13dd2945 5c5c2a3d",
        hash: import_hash3.default.sha256,
        gRed: false,
        g: [
          "b70e0cbd 6bb4bf7f 321390b9 4a03c1d3 56c21122 343280d6 115c1d21",
          "bd376388 b5f723fb 4c22dfe6 cd4375a0 5a074764 44d58199 85007e34"
        ]
      });
      defineCurve("p256", {
        type: "short",
        prime: null,
        p: "ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff ffffffff",
        a: "ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff fffffffc",
        b: "5ac635d8 aa3a93e7 b3ebbd55 769886bc 651d06b0 cc53b0f6 3bce3c3e 27d2604b",
        n: "ffffffff 00000000 ffffffff ffffffff bce6faad a7179e84 f3b9cac2 fc632551",
        hash: import_hash3.default.sha256,
        gRed: false,
        g: [
          "6b17d1f2 e12c4247 f8bce6e5 63a440f2 77037d81 2deb33a0 f4a13945 d898c296",
          "4fe342e2 fe1a7f9b 8ee7eb4a 7c0f9e16 2bce3357 6b315ece cbb64068 37bf51f5"
        ]
      });
      defineCurve("p384", {
        type: "short",
        prime: null,
        p: "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe ffffffff 00000000 00000000 ffffffff",
        a: "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe ffffffff 00000000 00000000 fffffffc",
        b: "b3312fa7 e23ee7e4 988e056b e3f82d19 181d9c6e fe814112 0314088f 5013875a c656398d 8a2ed19d 2a85c8ed d3ec2aef",
        n: "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff c7634d81 f4372ddf 581a0db2 48b0a77a ecec196a ccc52973",
        hash: import_hash3.default.sha384,
        gRed: false,
        g: [
          "aa87ca22 be8b0537 8eb1c71e f320ad74 6e1d3b62 8ba79b98 59f741e0 82542a38 5502f25d bf55296c 3a545e38 72760ab7",
          "3617de4a 96262c6f 5d9e98bf 9292dc29 f8f41dbd 289a147c e9da3113 b5f0b8c0 0a60b1ce 1d7e819d 7a431d7c 90ea0e5f"
        ]
      });
      defineCurve("p521", {
        type: "short",
        prime: null,
        p: "000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff",
        a: "000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffc",
        b: "00000051 953eb961 8e1c9a1f 929a21a0 b68540ee a2da725b 99b315f3 b8b48991 8ef109e1 56193951 ec7e937b 1652c0bd 3bb1bf07 3573df88 3d2c34f1 ef451fd4 6b503f00",
        n: "000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffa 51868783 bf2f966b 7fcc0148 f709a5d0 3bb5c9b8 899c47ae bb6fb71e 91386409",
        hash: import_hash3.default.sha512,
        gRed: false,
        g: [
          "000000c6 858e06b7 0404e9cd 9e3ecb66 2395b442 9c648139 053fb521 f828af60 6b4d3dba a14b5e77 efe75928 fe1dc127 a2ffa8de 3348b3c1 856a429b f97e7e31 c2e5bd66",
          "00000118 39296a78 9a3bc004 5c8a5fb4 2c7d1bd9 98f54449 579b4468 17afbd17 273e662c 97ee7299 5ef42640 c550b901 3fad0761 353c7086 a272c240 88be9476 9fd16650"
        ]
      });
      defineCurve("curve25519", {
        type: "mont",
        prime: "p25519",
        p: "7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed",
        a: "76d06",
        b: "1",
        n: "1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed",
        hash: import_hash3.default.sha256,
        gRed: false,
        g: [
          "9"
        ]
      });
      defineCurve("ed25519", {
        type: "edwards",
        prime: "p25519",
        p: "7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed",
        a: "-1",
        c: "1",
        // -121665 * (121666^(-1)) (mod P)
        d: "52036cee2b6ffe73 8cc740797779e898 00700a4d4141d8ab 75eb4dca135978a3",
        n: "1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed",
        hash: import_hash3.default.sha256,
        gRed: false,
        g: [
          "216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a",
          // 4/5
          "6666666666666666666666666666666666666666666666666666666666666658"
        ]
      });
      var pre;
      try {
        pre = /*RicMoo:ethers:require(./precomputed/secp256k1)*/
        null.crash();
      } catch (e) {
        pre = void 0;
      }
      defineCurve("secp256k1", {
        type: "short",
        prime: "k256",
        p: "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f",
        a: "0",
        b: "7",
        n: "ffffffff ffffffff ffffffff fffffffe baaedce6 af48a03b bfd25e8c d0364141",
        h: "1",
        hash: import_hash3.default.sha256,
        // Precomputed endomorphism
        beta: "7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee",
        lambda: "5363ad4cc05c30e0a5261c028812645a122e22ea20816678df02967c1b23bd72",
        basis: [
          {
            a: "3086d221a7d46bcde86c90e49284eb15",
            b: "-e4437ed6010e88286f547fa90abfe4c3"
          },
          {
            a: "114ca50f7a8e2f3f657c1108d9d44cfd8",
            b: "3086d221a7d46bcde86c90e49284eb15"
          }
        ],
        gRed: false,
        g: [
          "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
          "483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8",
          pre
        ]
      });
    });
    hmacDrbg = HmacDRBG;
    HmacDRBG.prototype._init = function init(entropy, nonce, pers) {
      var seed = entropy.concat(nonce).concat(pers);
      this.K = new Array(this.outLen / 8);
      this.V = new Array(this.outLen / 8);
      for (var i = 0; i < this.V.length; i++) {
        this.K[i] = 0;
        this.V[i] = 1;
      }
      this._update(seed);
      this._reseed = 1;
      this.reseedInterval = 281474976710656;
    };
    HmacDRBG.prototype._hmac = function hmac() {
      return new import_hash3.default.hmac(this.hash, this.K);
    };
    HmacDRBG.prototype._update = function update(seed) {
      var kmac = this._hmac().update(this.V).update([0]);
      if (seed)
        kmac = kmac.update(seed);
      this.K = kmac.digest();
      this.V = this._hmac().update(this.V).digest();
      if (!seed)
        return;
      this.K = this._hmac().update(this.V).update([1]).update(seed).digest();
      this.V = this._hmac().update(this.V).digest();
    };
    HmacDRBG.prototype.reseed = function reseed(entropy, entropyEnc, add3, addEnc) {
      if (typeof entropyEnc !== "string") {
        addEnc = add3;
        add3 = entropyEnc;
        entropyEnc = null;
      }
      entropy = utils_1.toArray(entropy, entropyEnc);
      add3 = utils_1.toArray(add3, addEnc);
      minimalisticAssert(
        entropy.length >= this.minEntropy / 8,
        "Not enough entropy. Minimum is: " + this.minEntropy + " bits"
      );
      this._update(entropy.concat(add3 || []));
      this._reseed = 1;
    };
    HmacDRBG.prototype.generate = function generate(len, enc, add3, addEnc) {
      if (this._reseed > this.reseedInterval)
        throw new Error("Reseed is required");
      if (typeof enc !== "string") {
        addEnc = add3;
        add3 = enc;
        enc = null;
      }
      if (add3) {
        add3 = utils_1.toArray(add3, addEnc || "hex");
        this._update(add3);
      }
      var temp = [];
      while (temp.length < len) {
        this.V = this._hmac().update(this.V).digest();
        temp = temp.concat(this.V);
      }
      var res = temp.slice(0, len);
      this._update(add3);
      this._reseed++;
      return utils_1.encode(res, enc);
    };
    assert$3 = utils_1$1.assert;
    key = KeyPair;
    KeyPair.fromPublic = function fromPublic(ec2, pub, enc) {
      if (pub instanceof KeyPair)
        return pub;
      return new KeyPair(ec2, {
        pub,
        pubEnc: enc
      });
    };
    KeyPair.fromPrivate = function fromPrivate(ec2, priv, enc) {
      if (priv instanceof KeyPair)
        return priv;
      return new KeyPair(ec2, {
        priv,
        privEnc: enc
      });
    };
    KeyPair.prototype.validate = function validate4() {
      var pub = this.getPublic();
      if (pub.isInfinity())
        return { result: false, reason: "Invalid public key" };
      if (!pub.validate())
        return { result: false, reason: "Public key is not a point" };
      if (!pub.mul(this.ec.curve.n).isInfinity())
        return { result: false, reason: "Public key * N != O" };
      return { result: true, reason: null };
    };
    KeyPair.prototype.getPublic = function getPublic(compact, enc) {
      if (typeof compact === "string") {
        enc = compact;
        compact = null;
      }
      if (!this.pub)
        this.pub = this.ec.g.mul(this.priv);
      if (!enc)
        return this.pub;
      return this.pub.encode(enc, compact);
    };
    KeyPair.prototype.getPrivate = function getPrivate(enc) {
      if (enc === "hex")
        return this.priv.toString(16, 2);
      else
        return this.priv;
    };
    KeyPair.prototype._importPrivate = function _importPrivate(key2, enc) {
      this.priv = new import_bn2.default(key2, enc || 16);
      this.priv = this.priv.umod(this.ec.curve.n);
    };
    KeyPair.prototype._importPublic = function _importPublic(key2, enc) {
      if (key2.x || key2.y) {
        if (this.ec.curve.type === "mont") {
          assert$3(key2.x, "Need x coordinate");
        } else if (this.ec.curve.type === "short" || this.ec.curve.type === "edwards") {
          assert$3(key2.x && key2.y, "Need both x and y coordinate");
        }
        this.pub = this.ec.curve.point(key2.x, key2.y);
        return;
      }
      this.pub = this.ec.curve.decodePoint(key2, enc);
    };
    KeyPair.prototype.derive = function derive(pub) {
      if (!pub.validate()) {
        assert$3(pub.validate(), "public point not validated");
      }
      return pub.mul(this.priv).getX();
    };
    KeyPair.prototype.sign = function sign(msg, enc, options) {
      return this.ec.sign(msg, this, enc, options);
    };
    KeyPair.prototype.verify = function verify(msg, signature2, options) {
      return this.ec.verify(msg, signature2, this, void 0, options);
    };
    KeyPair.prototype.inspect = function inspect3() {
      return "<Key priv: " + (this.priv && this.priv.toString(16, 2)) + " pub: " + (this.pub && this.pub.inspect()) + " >";
    };
    assert$4 = utils_1$1.assert;
    signature = Signature;
    Signature.prototype._importDER = function _importDER(data, enc) {
      data = utils_1$1.toArray(data, enc);
      var p = new Position();
      if (data[p.place++] !== 48) {
        return false;
      }
      var len = getLength(data, p);
      if (len === false) {
        return false;
      }
      if (len + p.place !== data.length) {
        return false;
      }
      if (data[p.place++] !== 2) {
        return false;
      }
      var rlen = getLength(data, p);
      if (rlen === false) {
        return false;
      }
      if ((data[p.place] & 128) !== 0) {
        return false;
      }
      var r2 = data.slice(p.place, rlen + p.place);
      p.place += rlen;
      if (data[p.place++] !== 2) {
        return false;
      }
      var slen = getLength(data, p);
      if (slen === false) {
        return false;
      }
      if (data.length !== slen + p.place) {
        return false;
      }
      if ((data[p.place] & 128) !== 0) {
        return false;
      }
      var s = data.slice(p.place, slen + p.place);
      if (r2[0] === 0) {
        if (r2[1] & 128) {
          r2 = r2.slice(1);
        } else {
          return false;
        }
      }
      if (s[0] === 0) {
        if (s[1] & 128) {
          s = s.slice(1);
        } else {
          return false;
        }
      }
      this.r = new import_bn2.default(r2);
      this.s = new import_bn2.default(s);
      this.recoveryParam = null;
      return true;
    };
    Signature.prototype.toDER = function toDER(enc) {
      var r2 = this.r.toArray();
      var s = this.s.toArray();
      if (r2[0] & 128)
        r2 = [0].concat(r2);
      if (s[0] & 128)
        s = [0].concat(s);
      r2 = rmPadding(r2);
      s = rmPadding(s);
      while (!s[0] && !(s[1] & 128)) {
        s = s.slice(1);
      }
      var arr = [2];
      constructLength(arr, r2.length);
      arr = arr.concat(r2);
      arr.push(2);
      constructLength(arr, s.length);
      var backHalf = arr.concat(s);
      var res = [48];
      constructLength(res, backHalf.length);
      res = res.concat(backHalf);
      return utils_1$1.encode(res, enc);
    };
    rand = /*RicMoo:ethers:require(brorand)*/
    (function() {
      throw new Error("unsupported");
    });
    assert$5 = utils_1$1.assert;
    ec = EC;
    EC.prototype.keyPair = function keyPair(options) {
      return new key(this, options);
    };
    EC.prototype.keyFromPrivate = function keyFromPrivate(priv, enc) {
      return key.fromPrivate(this, priv, enc);
    };
    EC.prototype.keyFromPublic = function keyFromPublic(pub, enc) {
      return key.fromPublic(this, pub, enc);
    };
    EC.prototype.genKeyPair = function genKeyPair(options) {
      if (!options)
        options = {};
      var drbg = new hmacDrbg({
        hash: this.hash,
        pers: options.pers,
        persEnc: options.persEnc || "utf8",
        entropy: options.entropy || rand(this.hash.hmacStrength),
        entropyEnc: options.entropy && options.entropyEnc || "utf8",
        nonce: this.n.toArray()
      });
      var bytes = this.n.byteLength();
      var ns2 = this.n.sub(new import_bn2.default(2));
      for (; ; ) {
        var priv = new import_bn2.default(drbg.generate(bytes));
        if (priv.cmp(ns2) > 0)
          continue;
        priv.iaddn(1);
        return this.keyFromPrivate(priv);
      }
    };
    EC.prototype._truncateToN = function _truncateToN(msg, truncOnly, bitLength) {
      var byteLength;
      if (import_bn2.default.isBN(msg) || typeof msg === "number") {
        msg = new import_bn2.default(msg, 16);
        byteLength = msg.byteLength();
      } else if (typeof msg === "object") {
        byteLength = msg.length;
        msg = new import_bn2.default(msg, 16);
      } else {
        var str = msg.toString();
        byteLength = str.length + 1 >>> 1;
        msg = new import_bn2.default(str, 16);
      }
      if (typeof bitLength !== "number") {
        bitLength = byteLength * 8;
      }
      var delta = bitLength - this.n.bitLength();
      if (delta > 0)
        msg = msg.ushrn(delta);
      if (!truncOnly && msg.cmp(this.n) >= 0)
        return msg.sub(this.n);
      else
        return msg;
    };
    EC.prototype.sign = function sign2(msg, key2, enc, options) {
      if (typeof enc === "object") {
        options = enc;
        enc = null;
      }
      if (!options)
        options = {};
      if (typeof msg !== "string" && typeof msg !== "number" && !import_bn2.default.isBN(msg)) {
        assert$5(
          typeof msg === "object" && msg && typeof msg.length === "number",
          "Expected message to be an array-like, a hex string, or a BN instance"
        );
        assert$5(msg.length >>> 0 === msg.length);
        for (var i = 0; i < msg.length; i++) assert$5((msg[i] & 255) === msg[i]);
      }
      key2 = this.keyFromPrivate(key2, enc);
      msg = this._truncateToN(msg, false, options.msgBitLength);
      assert$5(!msg.isNeg(), "Can not sign a negative message");
      var bytes = this.n.byteLength();
      var bkey = key2.getPrivate().toArray("be", bytes);
      var nonce = msg.toArray("be", bytes);
      assert$5(new import_bn2.default(nonce).eq(msg), "Can not sign message");
      var drbg = new hmacDrbg({
        hash: this.hash,
        entropy: bkey,
        nonce,
        pers: options.pers,
        persEnc: options.persEnc || "utf8"
      });
      var ns1 = this.n.sub(new import_bn2.default(1));
      for (var iter = 0; ; iter++) {
        var k = options.k ? options.k(iter) : new import_bn2.default(drbg.generate(this.n.byteLength()));
        k = this._truncateToN(k, true);
        if (k.cmpn(1) <= 0 || k.cmp(ns1) >= 0)
          continue;
        var kp = this.g.mul(k);
        if (kp.isInfinity())
          continue;
        var kpX = kp.getX();
        var r2 = kpX.umod(this.n);
        if (r2.cmpn(0) === 0)
          continue;
        var s = k.invm(this.n).mul(r2.mul(key2.getPrivate()).iadd(msg));
        s = s.umod(this.n);
        if (s.cmpn(0) === 0)
          continue;
        var recoveryParam = (kp.getY().isOdd() ? 1 : 0) | (kpX.cmp(r2) !== 0 ? 2 : 0);
        if (options.canonical && s.cmp(this.nh) > 0) {
          s = this.n.sub(s);
          recoveryParam ^= 1;
        }
        return new signature({ r: r2, s, recoveryParam });
      }
    };
    EC.prototype.verify = function verify2(msg, signature$1, key2, enc, options) {
      if (!options)
        options = {};
      msg = this._truncateToN(msg, false, options.msgBitLength);
      key2 = this.keyFromPublic(key2, enc);
      signature$1 = new signature(signature$1, "hex");
      var r2 = signature$1.r;
      var s = signature$1.s;
      if (r2.cmpn(1) < 0 || r2.cmp(this.n) >= 0)
        return false;
      if (s.cmpn(1) < 0 || s.cmp(this.n) >= 0)
        return false;
      var sinv = s.invm(this.n);
      var u1 = sinv.mul(msg).umod(this.n);
      var u2 = sinv.mul(r2).umod(this.n);
      var p;
      if (!this.curve._maxwellTrick) {
        p = this.g.mulAdd(u1, key2.getPublic(), u2);
        if (p.isInfinity())
          return false;
        return p.getX().umod(this.n).cmp(r2) === 0;
      }
      p = this.g.jmulAdd(u1, key2.getPublic(), u2);
      if (p.isInfinity())
        return false;
      return p.eqXToP(r2);
    };
    EC.prototype.recoverPubKey = function(msg, signature$1, j, enc) {
      assert$5((3 & j) === j, "The recovery param is more than two bits");
      signature$1 = new signature(signature$1, enc);
      var n = this.n;
      var e = new import_bn2.default(msg);
      var r2 = signature$1.r;
      var s = signature$1.s;
      var isYOdd = j & 1;
      var isSecondKey = j >> 1;
      if (r2.cmp(this.curve.p.umod(this.curve.n)) >= 0 && isSecondKey)
        throw new Error("Unable to find sencond key candinate");
      if (isSecondKey)
        r2 = this.curve.pointFromX(r2.add(this.curve.n), isYOdd);
      else
        r2 = this.curve.pointFromX(r2, isYOdd);
      var rInv = signature$1.r.invm(n);
      var s1 = n.sub(e).mul(rInv).umod(n);
      var s2 = s.mul(rInv).umod(n);
      return this.g.mulAdd(s1, r2, s2);
    };
    EC.prototype.getKeyRecoveryParam = function(e, signature$1, Q, enc) {
      signature$1 = new signature(signature$1, enc);
      if (signature$1.recoveryParam !== null)
        return signature$1.recoveryParam;
      for (var i = 0; i < 4; i++) {
        var Qprime;
        try {
          Qprime = this.recoverPubKey(e, signature$1, i);
        } catch (e2) {
          continue;
        }
        if (Qprime.eq(Q))
          return i;
      }
      throw new Error("Unable to find valid recovery factor");
    };
    elliptic_1 = createCommonjsModule(function(module, exports) {
      "use strict";
      var elliptic = exports;
      elliptic.version = /*RicMoo:ethers*/
      { version: "6.6.1" }.version;
      elliptic.utils = utils_1$1;
      elliptic.rand = /*RicMoo:ethers:require(brorand)*/
      (function() {
        throw new Error("unsupported");
      });
      elliptic.curve = curve_1;
      elliptic.curves = curves_1;
      elliptic.ec = ec;
      elliptic.eddsa = /*RicMoo:ethers:require(./elliptic/eddsa)*/
      null;
    });
    EC$1 = elliptic_1.ec;
  }
});

// ../../node_modules/@ethersproject/signing-key/lib.esm/_version.js
var version11;
var init_version11 = __esm({
  "../../node_modules/@ethersproject/signing-key/lib.esm/_version.js"() {
    "use strict";
    version11 = "signing-key/5.8.0";
  }
});

// ../../node_modules/@ethersproject/signing-key/lib.esm/index.js
var lib_exports13 = {};
__export(lib_exports13, {
  SigningKey: () => SigningKey,
  computePublicKey: () => computePublicKey,
  recoverPublicKey: () => recoverPublicKey
});
function getCurve() {
  if (!_curve) {
    _curve = new EC$1("secp256k1");
  }
  return _curve;
}
function recoverPublicKey(digest, signature2) {
  const sig = splitSignature(signature2);
  const rs = { r: arrayify(sig.r), s: arrayify(sig.s) };
  return "0x" + getCurve().recoverPubKey(arrayify(digest), rs, sig.recoveryParam).encode("hex", false);
}
function computePublicKey(key2, compressed) {
  const bytes = arrayify(key2);
  if (bytes.length === 32) {
    const signingKey = new SigningKey(bytes);
    if (compressed) {
      return "0x" + getCurve().keyFromPrivate(bytes).getPublic(true, "hex");
    }
    return signingKey.publicKey;
  } else if (bytes.length === 33) {
    if (compressed) {
      return hexlify(bytes);
    }
    return "0x" + getCurve().keyFromPublic(bytes).getPublic(false, "hex");
  } else if (bytes.length === 65) {
    if (!compressed) {
      return hexlify(bytes);
    }
    return "0x" + getCurve().keyFromPublic(bytes).getPublic(true, "hex");
  }
  return logger16.throwArgumentError("invalid public or private key", "key", "[REDACTED]");
}
var logger16, _curve, SigningKey;
var init_lib17 = __esm({
  "../../node_modules/@ethersproject/signing-key/lib.esm/index.js"() {
    "use strict";
    init_elliptic();
    init_lib2();
    init_lib4();
    init_lib();
    init_version11();
    logger16 = new Logger(version11);
    _curve = null;
    SigningKey = class {
      constructor(privateKey) {
        defineReadOnly(this, "curve", "secp256k1");
        defineReadOnly(this, "privateKey", hexlify(privateKey));
        if (hexDataLength(this.privateKey) !== 32) {
          logger16.throwArgumentError("invalid private key", "privateKey", "[[ REDACTED ]]");
        }
        const keyPair2 = getCurve().keyFromPrivate(arrayify(this.privateKey));
        defineReadOnly(this, "publicKey", "0x" + keyPair2.getPublic(false, "hex"));
        defineReadOnly(this, "compressedPublicKey", "0x" + keyPair2.getPublic(true, "hex"));
        defineReadOnly(this, "_isSigningKey", true);
      }
      _addPoint(other) {
        const p0 = getCurve().keyFromPublic(arrayify(this.publicKey));
        const p1 = getCurve().keyFromPublic(arrayify(other));
        return "0x" + p0.pub.add(p1.pub).encodeCompressed("hex");
      }
      signDigest(digest) {
        const keyPair2 = getCurve().keyFromPrivate(arrayify(this.privateKey));
        const digestBytes = arrayify(digest);
        if (digestBytes.length !== 32) {
          logger16.throwArgumentError("bad digest length", "digest", digest);
        }
        const signature2 = keyPair2.sign(digestBytes, { canonical: true });
        return splitSignature({
          recoveryParam: signature2.recoveryParam,
          r: hexZeroPad("0x" + signature2.r.toString(16), 32),
          s: hexZeroPad("0x" + signature2.s.toString(16), 32)
        });
      }
      computeSharedSecret(otherKey) {
        const keyPair2 = getCurve().keyFromPrivate(arrayify(this.privateKey));
        const otherKeyPair = getCurve().keyFromPublic(arrayify(computePublicKey(otherKey)));
        return hexZeroPad("0x" + keyPair2.derive(otherKeyPair.getPublic()).toString(16), 32);
      }
      static isSigningKey(value) {
        return !!(value && value._isSigningKey);
      }
    };
  }
});

// ../../node_modules/@ethersproject/transactions/lib.esm/_version.js
var version12;
var init_version12 = __esm({
  "../../node_modules/@ethersproject/transactions/lib.esm/_version.js"() {
    "use strict";
    version12 = "transactions/5.8.0";
  }
});

// ../../node_modules/@ethersproject/transactions/lib.esm/index.js
var lib_exports14 = {};
__export(lib_exports14, {
  TransactionTypes: () => TransactionTypes,
  accessListify: () => accessListify,
  computeAddress: () => computeAddress,
  parse: () => parse,
  recoverAddress: () => recoverAddress,
  serialize: () => serialize
});
function handleAddress(value) {
  if (value === "0x") {
    return null;
  }
  return getAddress(value);
}
function handleNumber(value) {
  if (value === "0x") {
    return Zero2;
  }
  return BigNumber.from(value);
}
function computeAddress(key2) {
  const publicKey = computePublicKey(key2);
  return getAddress(hexDataSlice(keccak256(hexDataSlice(publicKey, 1)), 12));
}
function recoverAddress(digest, signature2) {
  return computeAddress(recoverPublicKey(arrayify(digest), signature2));
}
function formatNumber(value, name) {
  const result = stripZeros(BigNumber.from(value).toHexString());
  if (result.length > 32) {
    logger17.throwArgumentError("invalid length for " + name, "transaction:" + name, value);
  }
  return result;
}
function accessSetify(addr, storageKeys) {
  return {
    address: getAddress(addr),
    storageKeys: (storageKeys || []).map((storageKey, index) => {
      if (hexDataLength(storageKey) !== 32) {
        logger17.throwArgumentError("invalid access list storageKey", `accessList[${addr}:${index}]`, storageKey);
      }
      return storageKey.toLowerCase();
    })
  };
}
function accessListify(value) {
  if (Array.isArray(value)) {
    return value.map((set, index) => {
      if (Array.isArray(set)) {
        if (set.length > 2) {
          logger17.throwArgumentError("access list expected to be [ address, storageKeys[] ]", `value[${index}]`, set);
        }
        return accessSetify(set[0], set[1]);
      }
      return accessSetify(set.address, set.storageKeys);
    });
  }
  const result = Object.keys(value).map((addr) => {
    const storageKeys = value[addr].reduce((accum, storageKey) => {
      accum[storageKey] = true;
      return accum;
    }, {});
    return accessSetify(addr, Object.keys(storageKeys).sort());
  });
  result.sort((a, b) => a.address.localeCompare(b.address));
  return result;
}
function formatAccessList(value) {
  return accessListify(value).map((set) => [set.address, set.storageKeys]);
}
function _serializeEip1559(transaction, signature2) {
  if (transaction.gasPrice != null) {
    const gasPrice = BigNumber.from(transaction.gasPrice);
    const maxFeePerGas = BigNumber.from(transaction.maxFeePerGas || 0);
    if (!gasPrice.eq(maxFeePerGas)) {
      logger17.throwArgumentError("mismatch EIP-1559 gasPrice != maxFeePerGas", "tx", {
        gasPrice,
        maxFeePerGas
      });
    }
  }
  const fields = [
    formatNumber(transaction.chainId || 0, "chainId"),
    formatNumber(transaction.nonce || 0, "nonce"),
    formatNumber(transaction.maxPriorityFeePerGas || 0, "maxPriorityFeePerGas"),
    formatNumber(transaction.maxFeePerGas || 0, "maxFeePerGas"),
    formatNumber(transaction.gasLimit || 0, "gasLimit"),
    transaction.to != null ? getAddress(transaction.to) : "0x",
    formatNumber(transaction.value || 0, "value"),
    transaction.data || "0x",
    formatAccessList(transaction.accessList || [])
  ];
  if (signature2) {
    const sig = splitSignature(signature2);
    fields.push(formatNumber(sig.recoveryParam, "recoveryParam"));
    fields.push(stripZeros(sig.r));
    fields.push(stripZeros(sig.s));
  }
  return hexConcat(["0x02", encode(fields)]);
}
function _serializeEip2930(transaction, signature2) {
  const fields = [
    formatNumber(transaction.chainId || 0, "chainId"),
    formatNumber(transaction.nonce || 0, "nonce"),
    formatNumber(transaction.gasPrice || 0, "gasPrice"),
    formatNumber(transaction.gasLimit || 0, "gasLimit"),
    transaction.to != null ? getAddress(transaction.to) : "0x",
    formatNumber(transaction.value || 0, "value"),
    transaction.data || "0x",
    formatAccessList(transaction.accessList || [])
  ];
  if (signature2) {
    const sig = splitSignature(signature2);
    fields.push(formatNumber(sig.recoveryParam, "recoveryParam"));
    fields.push(stripZeros(sig.r));
    fields.push(stripZeros(sig.s));
  }
  return hexConcat(["0x01", encode(fields)]);
}
function _serialize(transaction, signature2) {
  checkProperties(transaction, allowedTransactionKeys);
  const raw = [];
  transactionFields.forEach(function(fieldInfo) {
    let value = transaction[fieldInfo.name] || [];
    const options = {};
    if (fieldInfo.numeric) {
      options.hexPad = "left";
    }
    value = arrayify(hexlify(value, options));
    if (fieldInfo.length && value.length !== fieldInfo.length && value.length > 0) {
      logger17.throwArgumentError("invalid length for " + fieldInfo.name, "transaction:" + fieldInfo.name, value);
    }
    if (fieldInfo.maxLength) {
      value = stripZeros(value);
      if (value.length > fieldInfo.maxLength) {
        logger17.throwArgumentError("invalid length for " + fieldInfo.name, "transaction:" + fieldInfo.name, value);
      }
    }
    raw.push(hexlify(value));
  });
  let chainId = 0;
  if (transaction.chainId != null) {
    chainId = transaction.chainId;
    if (typeof chainId !== "number") {
      logger17.throwArgumentError("invalid transaction.chainId", "transaction", transaction);
    }
  } else if (signature2 && !isBytesLike(signature2) && signature2.v > 28) {
    chainId = Math.floor((signature2.v - 35) / 2);
  }
  if (chainId !== 0) {
    raw.push(hexlify(chainId));
    raw.push("0x");
    raw.push("0x");
  }
  if (!signature2) {
    return encode(raw);
  }
  const sig = splitSignature(signature2);
  let v = 27 + sig.recoveryParam;
  if (chainId !== 0) {
    raw.pop();
    raw.pop();
    raw.pop();
    v += chainId * 2 + 8;
    if (sig.v > 28 && sig.v !== v) {
      logger17.throwArgumentError("transaction.chainId/signature.v mismatch", "signature", signature2);
    }
  } else if (sig.v !== v) {
    logger17.throwArgumentError("transaction.chainId/signature.v mismatch", "signature", signature2);
  }
  raw.push(hexlify(v));
  raw.push(stripZeros(arrayify(sig.r)));
  raw.push(stripZeros(arrayify(sig.s)));
  return encode(raw);
}
function serialize(transaction, signature2) {
  if (transaction.type == null || transaction.type === 0) {
    if (transaction.accessList != null) {
      logger17.throwArgumentError("untyped transactions do not support accessList; include type: 1", "transaction", transaction);
    }
    return _serialize(transaction, signature2);
  }
  switch (transaction.type) {
    case 1:
      return _serializeEip2930(transaction, signature2);
    case 2:
      return _serializeEip1559(transaction, signature2);
    default:
      break;
  }
  return logger17.throwError(`unsupported transaction type: ${transaction.type}`, Logger.errors.UNSUPPORTED_OPERATION, {
    operation: "serializeTransaction",
    transactionType: transaction.type
  });
}
function _parseEipSignature(tx, fields, serialize2) {
  try {
    const recid = handleNumber(fields[0]).toNumber();
    if (recid !== 0 && recid !== 1) {
      throw new Error("bad recid");
    }
    tx.v = recid;
  } catch (error) {
    logger17.throwArgumentError("invalid v for transaction type: 1", "v", fields[0]);
  }
  tx.r = hexZeroPad(fields[1], 32);
  tx.s = hexZeroPad(fields[2], 32);
  try {
    const digest = keccak256(serialize2(tx));
    tx.from = recoverAddress(digest, { r: tx.r, s: tx.s, recoveryParam: tx.v });
  } catch (error) {
  }
}
function _parseEip1559(payload) {
  const transaction = decode(payload.slice(1));
  if (transaction.length !== 9 && transaction.length !== 12) {
    logger17.throwArgumentError("invalid component count for transaction type: 2", "payload", hexlify(payload));
  }
  const maxPriorityFeePerGas = handleNumber(transaction[2]);
  const maxFeePerGas = handleNumber(transaction[3]);
  const tx = {
    type: 2,
    chainId: handleNumber(transaction[0]).toNumber(),
    nonce: handleNumber(transaction[1]).toNumber(),
    maxPriorityFeePerGas,
    maxFeePerGas,
    gasPrice: null,
    gasLimit: handleNumber(transaction[4]),
    to: handleAddress(transaction[5]),
    value: handleNumber(transaction[6]),
    data: transaction[7],
    accessList: accessListify(transaction[8])
  };
  if (transaction.length === 9) {
    return tx;
  }
  tx.hash = keccak256(payload);
  _parseEipSignature(tx, transaction.slice(9), _serializeEip1559);
  return tx;
}
function _parseEip2930(payload) {
  const transaction = decode(payload.slice(1));
  if (transaction.length !== 8 && transaction.length !== 11) {
    logger17.throwArgumentError("invalid component count for transaction type: 1", "payload", hexlify(payload));
  }
  const tx = {
    type: 1,
    chainId: handleNumber(transaction[0]).toNumber(),
    nonce: handleNumber(transaction[1]).toNumber(),
    gasPrice: handleNumber(transaction[2]),
    gasLimit: handleNumber(transaction[3]),
    to: handleAddress(transaction[4]),
    value: handleNumber(transaction[5]),
    data: transaction[6],
    accessList: accessListify(transaction[7])
  };
  if (transaction.length === 8) {
    return tx;
  }
  tx.hash = keccak256(payload);
  _parseEipSignature(tx, transaction.slice(8), _serializeEip2930);
  return tx;
}
function _parse(rawTransaction) {
  const transaction = decode(rawTransaction);
  if (transaction.length !== 9 && transaction.length !== 6) {
    logger17.throwArgumentError("invalid raw transaction", "rawTransaction", rawTransaction);
  }
  const tx = {
    nonce: handleNumber(transaction[0]).toNumber(),
    gasPrice: handleNumber(transaction[1]),
    gasLimit: handleNumber(transaction[2]),
    to: handleAddress(transaction[3]),
    value: handleNumber(transaction[4]),
    data: transaction[5],
    chainId: 0
  };
  if (transaction.length === 6) {
    return tx;
  }
  try {
    tx.v = BigNumber.from(transaction[6]).toNumber();
  } catch (error) {
    return tx;
  }
  tx.r = hexZeroPad(transaction[7], 32);
  tx.s = hexZeroPad(transaction[8], 32);
  if (BigNumber.from(tx.r).isZero() && BigNumber.from(tx.s).isZero()) {
    tx.chainId = tx.v;
    tx.v = 0;
  } else {
    tx.chainId = Math.floor((tx.v - 35) / 2);
    if (tx.chainId < 0) {
      tx.chainId = 0;
    }
    let recoveryParam = tx.v - 27;
    const raw = transaction.slice(0, 6);
    if (tx.chainId !== 0) {
      raw.push(hexlify(tx.chainId));
      raw.push("0x");
      raw.push("0x");
      recoveryParam -= tx.chainId * 2 + 8;
    }
    const digest = keccak256(encode(raw));
    try {
      tx.from = recoverAddress(digest, { r: hexlify(tx.r), s: hexlify(tx.s), recoveryParam });
    } catch (error) {
    }
    tx.hash = keccak256(rawTransaction);
  }
  tx.type = null;
  return tx;
}
function parse(rawTransaction) {
  const payload = arrayify(rawTransaction);
  if (payload[0] > 127) {
    return _parse(payload);
  }
  switch (payload[0]) {
    case 1:
      return _parseEip2930(payload);
    case 2:
      return _parseEip1559(payload);
    default:
      break;
  }
  return logger17.throwError(`unsupported transaction type: ${payload[0]}`, Logger.errors.UNSUPPORTED_OPERATION, {
    operation: "parseTransaction",
    transactionType: payload[0]
  });
}
var logger17, TransactionTypes, transactionFields, allowedTransactionKeys;
var init_lib18 = __esm({
  "../../node_modules/@ethersproject/transactions/lib.esm/index.js"() {
    "use strict";
    init_lib7();
    init_lib3();
    init_lib2();
    init_lib8();
    init_lib5();
    init_lib4();
    init_lib6();
    init_lib17();
    init_lib();
    init_version12();
    logger17 = new Logger(version12);
    (function(TransactionTypes2) {
      TransactionTypes2[TransactionTypes2["legacy"] = 0] = "legacy";
      TransactionTypes2[TransactionTypes2["eip2930"] = 1] = "eip2930";
      TransactionTypes2[TransactionTypes2["eip1559"] = 2] = "eip1559";
    })(TransactionTypes || (TransactionTypes = {}));
    transactionFields = [
      { name: "nonce", maxLength: 32, numeric: true },
      { name: "gasPrice", maxLength: 32, numeric: true },
      { name: "gasLimit", maxLength: 32, numeric: true },
      { name: "to", length: 20 },
      { name: "value", maxLength: 32, numeric: true },
      { name: "data" }
    ];
    allowedTransactionKeys = {
      chainId: true,
      data: true,
      gasLimit: true,
      gasPrice: true,
      nonce: true,
      to: true,
      type: true,
      value: true
    };
  }
});

// ../../node_modules/@ethersproject/wordlists/lib.esm/_version.js
var version13;
var init_version13 = __esm({
  "../../node_modules/@ethersproject/wordlists/lib.esm/_version.js"() {
    "use strict";
    version13 = "wordlists/5.8.0";
  }
});

// ../../node_modules/@ethersproject/wordlists/lib.esm/wordlist.js
var exportWordlist, logger18, Wordlist;
var init_wordlist = __esm({
  "../../node_modules/@ethersproject/wordlists/lib.esm/wordlist.js"() {
    "use strict";
    init_lib12();
    init_lib4();
    init_lib();
    init_version13();
    exportWordlist = false;
    logger18 = new Logger(version13);
    Wordlist = class _Wordlist {
      constructor(locale) {
        logger18.checkAbstract(new.target, _Wordlist);
        defineReadOnly(this, "locale", locale);
      }
      // Subclasses may override this
      split(mnemonic) {
        return mnemonic.toLowerCase().split(/ +/g);
      }
      // Subclasses may override this
      join(words2) {
        return words2.join(" ");
      }
      static check(wordlist2) {
        const words2 = [];
        for (let i = 0; i < 2048; i++) {
          const word = wordlist2.getWord(i);
          if (i !== wordlist2.getWordIndex(word)) {
            return "0x";
          }
          words2.push(word);
        }
        return id(words2.join("\n") + "\n");
      }
      static register(lang, name) {
        if (!name) {
          name = lang.locale;
        }
        if (exportWordlist) {
          try {
            const anyGlobal2 = window;
            if (anyGlobal2._ethers && anyGlobal2._ethers.wordlists) {
              if (!anyGlobal2._ethers.wordlists[name]) {
                defineReadOnly(anyGlobal2._ethers.wordlists, name, lang);
              }
            }
          } catch (error) {
          }
        }
      }
    };
  }
});

// ../../node_modules/@ethersproject/wordlists/lib.esm/lang-en.js
function loadWords(lang) {
  if (wordlist != null) {
    return;
  }
  wordlist = words.replace(/([A-Z])/g, " $1").toLowerCase().substring(1).split(" ");
  if (Wordlist.check(lang) !== "0x3c8acc1e7b08d8e76f9fda015ef48dc8c710a73cb7e0f77b2c18a9b5a7adde60") {
    wordlist = null;
    throw new Error("BIP39 Wordlist for en (English) FAILED");
  }
}
var words, wordlist, LangEn, langEn;
var init_lang_en = __esm({
  "../../node_modules/@ethersproject/wordlists/lib.esm/lang-en.js"() {
    "use strict";
    init_wordlist();
    words = "AbandonAbilityAbleAboutAboveAbsentAbsorbAbstractAbsurdAbuseAccessAccidentAccountAccuseAchieveAcidAcousticAcquireAcrossActActionActorActressActualAdaptAddAddictAddressAdjustAdmitAdultAdvanceAdviceAerobicAffairAffordAfraidAgainAgeAgentAgreeAheadAimAirAirportAisleAlarmAlbumAlcoholAlertAlienAllAlleyAllowAlmostAloneAlphaAlreadyAlsoAlterAlwaysAmateurAmazingAmongAmountAmusedAnalystAnchorAncientAngerAngleAngryAnimalAnkleAnnounceAnnualAnotherAnswerAntennaAntiqueAnxietyAnyApartApologyAppearAppleApproveAprilArchArcticAreaArenaArgueArmArmedArmorArmyAroundArrangeArrestArriveArrowArtArtefactArtistArtworkAskAspectAssaultAssetAssistAssumeAsthmaAthleteAtomAttackAttendAttitudeAttractAuctionAuditAugustAuntAuthorAutoAutumnAverageAvocadoAvoidAwakeAwareAwayAwesomeAwfulAwkwardAxisBabyBachelorBaconBadgeBagBalanceBalconyBallBambooBananaBannerBarBarelyBargainBarrelBaseBasicBasketBattleBeachBeanBeautyBecauseBecomeBeefBeforeBeginBehaveBehindBelieveBelowBeltBenchBenefitBestBetrayBetterBetweenBeyondBicycleBidBikeBindBiologyBirdBirthBitterBlackBladeBlameBlanketBlastBleakBlessBlindBloodBlossomBlouseBlueBlurBlushBoardBoatBodyBoilBombBoneBonusBookBoostBorderBoringBorrowBossBottomBounceBoxBoyBracketBrainBrandBrassBraveBreadBreezeBrickBridgeBriefBrightBringBriskBroccoliBrokenBronzeBroomBrotherBrownBrushBubbleBuddyBudgetBuffaloBuildBulbBulkBulletBundleBunkerBurdenBurgerBurstBusBusinessBusyButterBuyerBuzzCabbageCabinCableCactusCageCakeCallCalmCameraCampCanCanalCancelCandyCannonCanoeCanvasCanyonCapableCapitalCaptainCarCarbonCardCargoCarpetCarryCartCaseCashCasinoCastleCasualCatCatalogCatchCategoryCattleCaughtCauseCautionCaveCeilingCeleryCementCensusCenturyCerealCertainChairChalkChampionChangeChaosChapterChargeChaseChatCheapCheckCheeseChefCherryChestChickenChiefChildChimneyChoiceChooseChronicChuckleChunkChurnCigarCinnamonCircleCitizenCityCivilClaimClapClarifyClawClayCleanClerkCleverClickClientCliffClimbClinicClipClockClogCloseClothCloudClownClubClumpClusterClutchCoachCoastCoconutCodeCoffeeCoilCoinCollectColorColumnCombineComeComfortComicCommonCompanyConcertConductConfirmCongressConnectConsiderControlConvinceCookCoolCopperCopyCoralCoreCornCorrectCostCottonCouchCountryCoupleCourseCousinCoverCoyoteCrackCradleCraftCramCraneCrashCraterCrawlCrazyCreamCreditCreekCrewCricketCrimeCrispCriticCropCrossCrouchCrowdCrucialCruelCruiseCrumbleCrunchCrushCryCrystalCubeCultureCupCupboardCuriousCurrentCurtainCurveCushionCustomCuteCycleDadDamageDampDanceDangerDaringDashDaughterDawnDayDealDebateDebrisDecadeDecemberDecideDeclineDecorateDecreaseDeerDefenseDefineDefyDegreeDelayDeliverDemandDemiseDenialDentistDenyDepartDependDepositDepthDeputyDeriveDescribeDesertDesignDeskDespairDestroyDetailDetectDevelopDeviceDevoteDiagramDialDiamondDiaryDiceDieselDietDifferDigitalDignityDilemmaDinnerDinosaurDirectDirtDisagreeDiscoverDiseaseDishDismissDisorderDisplayDistanceDivertDivideDivorceDizzyDoctorDocumentDogDollDolphinDomainDonateDonkeyDonorDoorDoseDoubleDoveDraftDragonDramaDrasticDrawDreamDressDriftDrillDrinkDripDriveDropDrumDryDuckDumbDuneDuringDustDutchDutyDwarfDynamicEagerEagleEarlyEarnEarthEasilyEastEasyEchoEcologyEconomyEdgeEditEducateEffortEggEightEitherElbowElderElectricElegantElementElephantElevatorEliteElseEmbarkEmbodyEmbraceEmergeEmotionEmployEmpowerEmptyEnableEnactEndEndlessEndorseEnemyEnergyEnforceEngageEngineEnhanceEnjoyEnlistEnoughEnrichEnrollEnsureEnterEntireEntryEnvelopeEpisodeEqualEquipEraEraseErodeErosionErrorEruptEscapeEssayEssenceEstateEternalEthicsEvidenceEvilEvokeEvolveExactExampleExcessExchangeExciteExcludeExcuseExecuteExerciseExhaustExhibitExileExistExitExoticExpandExpectExpireExplainExposeExpressExtendExtraEyeEyebrowFabricFaceFacultyFadeFaintFaithFallFalseFameFamilyFamousFanFancyFantasyFarmFashionFatFatalFatherFatigueFaultFavoriteFeatureFebruaryFederalFeeFeedFeelFemaleFenceFestivalFetchFeverFewFiberFictionFieldFigureFileFilmFilterFinalFindFineFingerFinishFireFirmFirstFiscalFishFitFitnessFixFlagFlameFlashFlatFlavorFleeFlightFlipFloatFlockFloorFlowerFluidFlushFlyFoamFocusFogFoilFoldFollowFoodFootForceForestForgetForkFortuneForumForwardFossilFosterFoundFoxFragileFrameFrequentFreshFriendFringeFrogFrontFrostFrownFrozenFruitFuelFunFunnyFurnaceFuryFutureGadgetGainGalaxyGalleryGameGapGarageGarbageGardenGarlicGarmentGasGaspGateGatherGaugeGazeGeneralGeniusGenreGentleGenuineGestureGhostGiantGiftGiggleGingerGiraffeGirlGiveGladGlanceGlareGlassGlideGlimpseGlobeGloomGloryGloveGlowGlueGoatGoddessGoldGoodGooseGorillaGospelGossipGovernGownGrabGraceGrainGrantGrapeGrassGravityGreatGreenGridGriefGritGroceryGroupGrowGruntGuardGuessGuideGuiltGuitarGunGymHabitHairHalfHammerHamsterHandHappyHarborHardHarshHarvestHatHaveHawkHazardHeadHealthHeartHeavyHedgehogHeightHelloHelmetHelpHenHeroHiddenHighHillHintHipHireHistoryHobbyHockeyHoldHoleHolidayHollowHomeHoneyHoodHopeHornHorrorHorseHospitalHostHotelHourHoverHubHugeHumanHumbleHumorHundredHungryHuntHurdleHurryHurtHusbandHybridIceIconIdeaIdentifyIdleIgnoreIllIllegalIllnessImageImitateImmenseImmuneImpactImposeImproveImpulseInchIncludeIncomeIncreaseIndexIndicateIndoorIndustryInfantInflictInformInhaleInheritInitialInjectInjuryInmateInnerInnocentInputInquiryInsaneInsectInsideInspireInstallIntactInterestIntoInvestInviteInvolveIronIslandIsolateIssueItemIvoryJacketJaguarJarJazzJealousJeansJellyJewelJobJoinJokeJourneyJoyJudgeJuiceJumpJungleJuniorJunkJustKangarooKeenKeepKetchupKeyKickKidKidneyKindKingdomKissKitKitchenKiteKittenKiwiKneeKnifeKnockKnowLabLabelLaborLadderLadyLakeLampLanguageLaptopLargeLaterLatinLaughLaundryLavaLawLawnLawsuitLayerLazyLeaderLeafLearnLeaveLectureLeftLegLegalLegendLeisureLemonLendLengthLensLeopardLessonLetterLevelLiarLibertyLibraryLicenseLifeLiftLightLikeLimbLimitLinkLionLiquidListLittleLiveLizardLoadLoanLobsterLocalLockLogicLonelyLongLoopLotteryLoudLoungeLoveLoyalLuckyLuggageLumberLunarLunchLuxuryLyricsMachineMadMagicMagnetMaidMailMainMajorMakeMammalManManageMandateMangoMansionManualMapleMarbleMarchMarginMarineMarketMarriageMaskMassMasterMatchMaterialMathMatrixMatterMaximumMazeMeadowMeanMeasureMeatMechanicMedalMediaMelodyMeltMemberMemoryMentionMenuMercyMergeMeritMerryMeshMessageMetalMethodMiddleMidnightMilkMillionMimicMindMinimumMinorMinuteMiracleMirrorMiseryMissMistakeMixMixedMixtureMobileModelModifyMomMomentMonitorMonkeyMonsterMonthMoonMoralMoreMorningMosquitoMotherMotionMotorMountainMouseMoveMovieMuchMuffinMuleMultiplyMuscleMuseumMushroomMusicMustMutualMyselfMysteryMythNaiveNameNapkinNarrowNastyNationNatureNearNeckNeedNegativeNeglectNeitherNephewNerveNestNetNetworkNeutralNeverNewsNextNiceNightNobleNoiseNomineeNoodleNormalNorthNoseNotableNoteNothingNoticeNovelNowNuclearNumberNurseNutOakObeyObjectObligeObscureObserveObtainObviousOccurOceanOctoberOdorOffOfferOfficeOftenOilOkayOldOliveOlympicOmitOnceOneOnionOnlineOnlyOpenOperaOpinionOpposeOptionOrangeOrbitOrchardOrderOrdinaryOrganOrientOriginalOrphanOstrichOtherOutdoorOuterOutputOutsideOvalOvenOverOwnOwnerOxygenOysterOzonePactPaddlePagePairPalacePalmPandaPanelPanicPantherPaperParadeParentParkParrotPartyPassPatchPathPatientPatrolPatternPausePavePaymentPeacePeanutPearPeasantPelicanPenPenaltyPencilPeoplePepperPerfectPermitPersonPetPhonePhotoPhrasePhysicalPianoPicnicPicturePiecePigPigeonPillPilotPinkPioneerPipePistolPitchPizzaPlacePlanetPlasticPlatePlayPleasePledgePluckPlugPlungePoemPoetPointPolarPolePolicePondPonyPoolPopularPortionPositionPossiblePostPotatoPotteryPovertyPowderPowerPracticePraisePredictPreferPreparePresentPrettyPreventPricePridePrimaryPrintPriorityPrisonPrivatePrizeProblemProcessProduceProfitProgramProjectPromoteProofPropertyProsperProtectProudProvidePublicPuddingPullPulpPulsePumpkinPunchPupilPuppyPurchasePurityPurposePursePushPutPuzzlePyramidQualityQuantumQuarterQuestionQuickQuitQuizQuoteRabbitRaccoonRaceRackRadarRadioRailRainRaiseRallyRampRanchRandomRangeRapidRareRateRatherRavenRawRazorReadyRealReasonRebelRebuildRecallReceiveRecipeRecordRecycleReduceReflectReformRefuseRegionRegretRegularRejectRelaxReleaseReliefRelyRemainRememberRemindRemoveRenderRenewRentReopenRepairRepeatReplaceReportRequireRescueResembleResistResourceResponseResultRetireRetreatReturnReunionRevealReviewRewardRhythmRibRibbonRiceRichRideRidgeRifleRightRigidRingRiotRippleRiskRitualRivalRiverRoadRoastRobotRobustRocketRomanceRoofRookieRoomRoseRotateRoughRoundRouteRoyalRubberRudeRugRuleRunRunwayRuralSadSaddleSadnessSafeSailSaladSalmonSalonSaltSaluteSameSampleSandSatisfySatoshiSauceSausageSaveSayScaleScanScareScatterSceneSchemeSchoolScienceScissorsScorpionScoutScrapScreenScriptScrubSeaSearchSeasonSeatSecondSecretSectionSecuritySeedSeekSegmentSelectSellSeminarSeniorSenseSentenceSeriesServiceSessionSettleSetupSevenShadowShaftShallowShareShedShellSheriffShieldShiftShineShipShiverShockShoeShootShopShortShoulderShoveShrimpShrugShuffleShySiblingSickSideSiegeSightSignSilentSilkSillySilverSimilarSimpleSinceSingSirenSisterSituateSixSizeSkateSketchSkiSkillSkinSkirtSkullSlabSlamSleepSlenderSliceSlideSlightSlimSloganSlotSlowSlushSmallSmartSmileSmokeSmoothSnackSnakeSnapSniffSnowSoapSoccerSocialSockSodaSoftSolarSoldierSolidSolutionSolveSomeoneSongSoonSorrySortSoulSoundSoupSourceSouthSpaceSpareSpatialSpawnSpeakSpecialSpeedSpellSpendSphereSpiceSpiderSpikeSpinSpiritSplitSpoilSponsorSpoonSportSpotSpraySpreadSpringSpySquareSqueezeSquirrelStableStadiumStaffStageStairsStampStandStartStateStaySteakSteelStemStepStereoStickStillStingStockStomachStoneStoolStoryStoveStrategyStreetStrikeStrongStruggleStudentStuffStumbleStyleSubjectSubmitSubwaySuccessSuchSuddenSufferSugarSuggestSuitSummerSunSunnySunsetSuperSupplySupremeSureSurfaceSurgeSurpriseSurroundSurveySuspectSustainSwallowSwampSwapSwarmSwearSweetSwiftSwimSwingSwitchSwordSymbolSymptomSyrupSystemTableTackleTagTailTalentTalkTankTapeTargetTaskTasteTattooTaxiTeachTeamTellTenTenantTennisTentTermTestTextThankThatThemeThenTheoryThereTheyThingThisThoughtThreeThriveThrowThumbThunderTicketTideTigerTiltTimberTimeTinyTipTiredTissueTitleToastTobaccoTodayToddlerToeTogetherToiletTokenTomatoTomorrowToneTongueTonightToolToothTopTopicToppleTorchTornadoTortoiseTossTotalTouristTowardTowerTownToyTrackTradeTrafficTragicTrainTransferTrapTrashTravelTrayTreatTreeTrendTrialTribeTrickTriggerTrimTripTrophyTroubleTruckTrueTrulyTrumpetTrustTruthTryTubeTuitionTumbleTunaTunnelTurkeyTurnTurtleTwelveTwentyTwiceTwinTwistTwoTypeTypicalUglyUmbrellaUnableUnawareUncleUncoverUnderUndoUnfairUnfoldUnhappyUniformUniqueUnitUniverseUnknownUnlockUntilUnusualUnveilUpdateUpgradeUpholdUponUpperUpsetUrbanUrgeUsageUseUsedUsefulUselessUsualUtilityVacantVacuumVagueValidValleyValveVanVanishVaporVariousVastVaultVehicleVelvetVendorVentureVenueVerbVerifyVersionVeryVesselVeteranViableVibrantViciousVictoryVideoViewVillageVintageViolinVirtualVirusVisaVisitVisualVitalVividVocalVoiceVoidVolcanoVolumeVoteVoyageWageWagonWaitWalkWallWalnutWantWarfareWarmWarriorWashWaspWasteWaterWaveWayWealthWeaponWearWeaselWeatherWebWeddingWeekendWeirdWelcomeWestWetWhaleWhatWheatWheelWhenWhereWhipWhisperWideWidthWifeWildWillWinWindowWineWingWinkWinnerWinterWireWisdomWiseWishWitnessWolfWomanWonderWoodWoolWordWorkWorldWorryWorthWrapWreckWrestleWristWriteWrongYardYearYellowYouYoungYouthZebraZeroZoneZoo";
    wordlist = null;
    LangEn = class extends Wordlist {
      constructor() {
        super("en");
      }
      getWord(index) {
        loadWords(this);
        return wordlist[index];
      }
      getWordIndex(word) {
        loadWords(this);
        return wordlist.indexOf(word);
      }
    };
    langEn = new LangEn();
    Wordlist.register(langEn);
  }
});

// ../../node_modules/@ethersproject/wordlists/lib.esm/wordlists.js
var wordlists;
var init_wordlists = __esm({
  "../../node_modules/@ethersproject/wordlists/lib.esm/wordlists.js"() {
    "use strict";
    init_lang_en();
    wordlists = {
      en: langEn
    };
  }
});

// ../../node_modules/@ethersproject/wordlists/lib.esm/index.js
var init_lib19 = __esm({
  "../../node_modules/@ethersproject/wordlists/lib.esm/index.js"() {
    "use strict";
    init_wordlists();
  }
});

// ../../node_modules/@ethersproject/hdnode/lib.esm/_version.js
var version14;
var init_version14 = __esm({
  "../../node_modules/@ethersproject/hdnode/lib.esm/_version.js"() {
    "use strict";
    version14 = "hdnode/5.8.0";
  }
});

// ../../node_modules/@ethersproject/hdnode/lib.esm/index.js
var lib_exports15 = {};
__export(lib_exports15, {
  HDNode: () => HDNode,
  defaultPath: () => defaultPath,
  entropyToMnemonic: () => entropyToMnemonic,
  getAccountPath: () => getAccountPath,
  isValidMnemonic: () => isValidMnemonic,
  mnemonicToEntropy: () => mnemonicToEntropy,
  mnemonicToSeed: () => mnemonicToSeed
});
function getUpperMask(bits) {
  return (1 << bits) - 1 << 8 - bits;
}
function getLowerMask(bits) {
  return (1 << bits) - 1;
}
function bytes32(value) {
  return hexZeroPad(hexlify(value), 32);
}
function base58check(data) {
  return Base58.encode(concat([data, hexDataSlice(sha256(sha256(data)), 0, 4)]));
}
function getWordlist(wordlist2) {
  if (wordlist2 == null) {
    return wordlists["en"];
  }
  if (typeof wordlist2 === "string") {
    const words2 = wordlists[wordlist2];
    if (words2 == null) {
      logger19.throwArgumentError("unknown locale", "wordlist", wordlist2);
    }
    return words2;
  }
  return wordlist2;
}
function mnemonicToSeed(mnemonic, password) {
  if (!password) {
    password = "";
  }
  const salt = toUtf8Bytes("mnemonic" + password, UnicodeNormalizationForm.NFKD);
  return pbkdf2(toUtf8Bytes(mnemonic, UnicodeNormalizationForm.NFKD), salt, 2048, 64, "sha512");
}
function mnemonicToEntropy(mnemonic, wordlist2) {
  wordlist2 = getWordlist(wordlist2);
  logger19.checkNormalize();
  const words2 = wordlist2.split(mnemonic);
  if (words2.length % 3 !== 0) {
    throw new Error("invalid mnemonic");
  }
  const entropy = arrayify(new Uint8Array(Math.ceil(11 * words2.length / 8)));
  let offset = 0;
  for (let i = 0; i < words2.length; i++) {
    let index = wordlist2.getWordIndex(words2[i].normalize("NFKD"));
    if (index === -1) {
      throw new Error("invalid mnemonic");
    }
    for (let bit = 0; bit < 11; bit++) {
      if (index & 1 << 10 - bit) {
        entropy[offset >> 3] |= 1 << 7 - offset % 8;
      }
      offset++;
    }
  }
  const entropyBits = 32 * words2.length / 3;
  const checksumBits = words2.length / 3;
  const checksumMask = getUpperMask(checksumBits);
  const checksum = arrayify(sha256(entropy.slice(0, entropyBits / 8)))[0] & checksumMask;
  if (checksum !== (entropy[entropy.length - 1] & checksumMask)) {
    throw new Error("invalid checksum");
  }
  return hexlify(entropy.slice(0, entropyBits / 8));
}
function entropyToMnemonic(entropy, wordlist2) {
  wordlist2 = getWordlist(wordlist2);
  entropy = arrayify(entropy);
  if (entropy.length % 4 !== 0 || entropy.length < 16 || entropy.length > 32) {
    throw new Error("invalid entropy");
  }
  const indices = [0];
  let remainingBits = 11;
  for (let i = 0; i < entropy.length; i++) {
    if (remainingBits > 8) {
      indices[indices.length - 1] <<= 8;
      indices[indices.length - 1] |= entropy[i];
      remainingBits -= 8;
    } else {
      indices[indices.length - 1] <<= remainingBits;
      indices[indices.length - 1] |= entropy[i] >> 8 - remainingBits;
      indices.push(entropy[i] & getLowerMask(8 - remainingBits));
      remainingBits += 3;
    }
  }
  const checksumBits = entropy.length / 4;
  const checksum = arrayify(sha256(entropy))[0] & getUpperMask(checksumBits);
  indices[indices.length - 1] <<= checksumBits;
  indices[indices.length - 1] |= checksum >> 8 - checksumBits;
  return wordlist2.join(indices.map((index) => wordlist2.getWord(index)));
}
function isValidMnemonic(mnemonic, wordlist2) {
  try {
    mnemonicToEntropy(mnemonic, wordlist2);
    return true;
  } catch (error) {
  }
  return false;
}
function getAccountPath(index) {
  if (typeof index !== "number" || index < 0 || index >= HardenedBit || index % 1) {
    logger19.throwArgumentError("invalid account index", "index", index);
  }
  return `m/44'/60'/${index}'/0/0`;
}
var logger19, N, MasterSecret, HardenedBit, _constructorGuard4, defaultPath, HDNode;
var init_lib20 = __esm({
  "../../node_modules/@ethersproject/hdnode/lib.esm/index.js"() {
    "use strict";
    init_lib14();
    init_lib2();
    init_lib3();
    init_lib9();
    init_lib16();
    init_lib4();
    init_lib17();
    init_lib15();
    init_lib18();
    init_lib19();
    init_lib();
    init_version14();
    logger19 = new Logger(version14);
    N = BigNumber.from("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141");
    MasterSecret = toUtf8Bytes("Bitcoin seed");
    HardenedBit = 2147483648;
    _constructorGuard4 = {};
    defaultPath = "m/44'/60'/0'/0/0";
    HDNode = class _HDNode {
      /**
       *  This constructor should not be called directly.
       *
       *  Please use:
       *   - fromMnemonic
       *   - fromSeed
       */
      constructor(constructorGuard, privateKey, publicKey, parentFingerprint, chainCode, index, depth, mnemonicOrPath) {
        if (constructorGuard !== _constructorGuard4) {
          throw new Error("HDNode constructor cannot be called directly");
        }
        if (privateKey) {
          const signingKey = new SigningKey(privateKey);
          defineReadOnly(this, "privateKey", signingKey.privateKey);
          defineReadOnly(this, "publicKey", signingKey.compressedPublicKey);
        } else {
          defineReadOnly(this, "privateKey", null);
          defineReadOnly(this, "publicKey", hexlify(publicKey));
        }
        defineReadOnly(this, "parentFingerprint", parentFingerprint);
        defineReadOnly(this, "fingerprint", hexDataSlice(ripemd160(sha256(this.publicKey)), 0, 4));
        defineReadOnly(this, "address", computeAddress(this.publicKey));
        defineReadOnly(this, "chainCode", chainCode);
        defineReadOnly(this, "index", index);
        defineReadOnly(this, "depth", depth);
        if (mnemonicOrPath == null) {
          defineReadOnly(this, "mnemonic", null);
          defineReadOnly(this, "path", null);
        } else if (typeof mnemonicOrPath === "string") {
          defineReadOnly(this, "mnemonic", null);
          defineReadOnly(this, "path", mnemonicOrPath);
        } else {
          defineReadOnly(this, "mnemonic", mnemonicOrPath);
          defineReadOnly(this, "path", mnemonicOrPath.path);
        }
      }
      get extendedKey() {
        if (this.depth >= 256) {
          throw new Error("Depth too large!");
        }
        return base58check(concat([
          this.privateKey != null ? "0x0488ADE4" : "0x0488B21E",
          hexlify(this.depth),
          this.parentFingerprint,
          hexZeroPad(hexlify(this.index), 4),
          this.chainCode,
          this.privateKey != null ? concat(["0x00", this.privateKey]) : this.publicKey
        ]));
      }
      neuter() {
        return new _HDNode(_constructorGuard4, null, this.publicKey, this.parentFingerprint, this.chainCode, this.index, this.depth, this.path);
      }
      _derive(index) {
        if (index > 4294967295) {
          throw new Error("invalid index - " + String(index));
        }
        let path = this.path;
        if (path) {
          path += "/" + (index & ~HardenedBit);
        }
        const data = new Uint8Array(37);
        if (index & HardenedBit) {
          if (!this.privateKey) {
            throw new Error("cannot derive child of neutered node");
          }
          data.set(arrayify(this.privateKey), 1);
          if (path) {
            path += "'";
          }
        } else {
          data.set(arrayify(this.publicKey));
        }
        for (let i = 24; i >= 0; i -= 8) {
          data[33 + (i >> 3)] = index >> 24 - i & 255;
        }
        const I = arrayify(computeHmac(SupportedAlgorithm.sha512, this.chainCode, data));
        const IL = I.slice(0, 32);
        const IR = I.slice(32);
        let ki = null;
        let Ki = null;
        if (this.privateKey) {
          ki = bytes32(BigNumber.from(IL).add(this.privateKey).mod(N));
        } else {
          const ek = new SigningKey(hexlify(IL));
          Ki = ek._addPoint(this.publicKey);
        }
        let mnemonicOrPath = path;
        const srcMnemonic = this.mnemonic;
        if (srcMnemonic) {
          mnemonicOrPath = Object.freeze({
            phrase: srcMnemonic.phrase,
            path,
            locale: srcMnemonic.locale || "en"
          });
        }
        return new _HDNode(_constructorGuard4, ki, Ki, this.fingerprint, bytes32(IR), index, this.depth + 1, mnemonicOrPath);
      }
      derivePath(path) {
        const components = path.split("/");
        if (components.length === 0 || components[0] === "m" && this.depth !== 0) {
          throw new Error("invalid path - " + path);
        }
        if (components[0] === "m") {
          components.shift();
        }
        let result = this;
        for (let i = 0; i < components.length; i++) {
          const component = components[i];
          if (component.match(/^[0-9]+'$/)) {
            const index = parseInt(component.substring(0, component.length - 1));
            if (index >= HardenedBit) {
              throw new Error("invalid path index - " + component);
            }
            result = result._derive(HardenedBit + index);
          } else if (component.match(/^[0-9]+$/)) {
            const index = parseInt(component);
            if (index >= HardenedBit) {
              throw new Error("invalid path index - " + component);
            }
            result = result._derive(index);
          } else {
            throw new Error("invalid path component - " + component);
          }
        }
        return result;
      }
      static _fromSeed(seed, mnemonic) {
        const seedArray = arrayify(seed);
        if (seedArray.length < 16 || seedArray.length > 64) {
          throw new Error("invalid seed");
        }
        const I = arrayify(computeHmac(SupportedAlgorithm.sha512, MasterSecret, seedArray));
        return new _HDNode(_constructorGuard4, bytes32(I.slice(0, 32)), null, "0x00000000", bytes32(I.slice(32)), 0, 0, mnemonic);
      }
      static fromMnemonic(mnemonic, password, wordlist2) {
        wordlist2 = getWordlist(wordlist2);
        mnemonic = entropyToMnemonic(mnemonicToEntropy(mnemonic, wordlist2), wordlist2);
        return _HDNode._fromSeed(mnemonicToSeed(mnemonic, password), {
          phrase: mnemonic,
          path: "m",
          locale: wordlist2.locale
        });
      }
      static fromSeed(seed) {
        return _HDNode._fromSeed(seed, null);
      }
      static fromExtendedKey(extendedKey) {
        const bytes = Base58.decode(extendedKey);
        if (bytes.length !== 82 || base58check(bytes.slice(0, 78)) !== extendedKey) {
          logger19.throwArgumentError("invalid extended key", "extendedKey", "[REDACTED]");
        }
        const depth = bytes[4];
        const parentFingerprint = hexlify(bytes.slice(5, 9));
        const index = parseInt(hexlify(bytes.slice(9, 13)).substring(2), 16);
        const chainCode = hexlify(bytes.slice(13, 45));
        const key2 = bytes.slice(45, 78);
        switch (hexlify(bytes.slice(0, 4))) {
          // Public Key
          case "0x0488b21e":
          case "0x043587cf":
            return new _HDNode(_constructorGuard4, null, hexlify(key2), parentFingerprint, chainCode, index, depth, null);
          // Private Key
          case "0x0488ade4":
          case "0x04358394 ":
            if (key2[0] !== 0) {
              break;
            }
            return new _HDNode(_constructorGuard4, hexlify(key2.slice(1)), null, parentFingerprint, chainCode, index, depth, null);
        }
        return logger19.throwArgumentError("invalid extended key", "extendedKey", "[REDACTED]");
      }
    };
  }
});

// ../../node_modules/@ethersproject/json-wallets/node_modules/aes-js/index.js
var require_aes_js = __commonJS({
  "../../node_modules/@ethersproject/json-wallets/node_modules/aes-js/index.js"(exports, module) {
    "use strict";
    (function(root) {
      function checkInt(value) {
        return parseInt(value) === value;
      }
      function checkInts(arrayish) {
        if (!checkInt(arrayish.length)) {
          return false;
        }
        for (var i = 0; i < arrayish.length; i++) {
          if (!checkInt(arrayish[i]) || arrayish[i] < 0 || arrayish[i] > 255) {
            return false;
          }
        }
        return true;
      }
      function coerceArray(arg, copy) {
        if (arg.buffer && ArrayBuffer.isView(arg) && arg.name === "Uint8Array") {
          if (copy) {
            if (arg.slice) {
              arg = arg.slice();
            } else {
              arg = Array.prototype.slice.call(arg);
            }
          }
          return arg;
        }
        if (Array.isArray(arg)) {
          if (!checkInts(arg)) {
            throw new Error("Array contains invalid value: " + arg);
          }
          return new Uint8Array(arg);
        }
        if (checkInt(arg.length) && checkInts(arg)) {
          return new Uint8Array(arg);
        }
        throw new Error("unsupported array-like object");
      }
      function createArray(length) {
        return new Uint8Array(length);
      }
      function copyArray(sourceArray, targetArray, targetStart, sourceStart, sourceEnd) {
        if (sourceStart != null || sourceEnd != null) {
          if (sourceArray.slice) {
            sourceArray = sourceArray.slice(sourceStart, sourceEnd);
          } else {
            sourceArray = Array.prototype.slice.call(sourceArray, sourceStart, sourceEnd);
          }
        }
        targetArray.set(sourceArray, targetStart);
      }
      var convertUtf8 = /* @__PURE__ */ (function() {
        function toBytes(text) {
          var result = [], i = 0;
          text = encodeURI(text);
          while (i < text.length) {
            var c = text.charCodeAt(i++);
            if (c === 37) {
              result.push(parseInt(text.substr(i, 2), 16));
              i += 2;
            } else {
              result.push(c);
            }
          }
          return coerceArray(result);
        }
        function fromBytes(bytes) {
          var result = [], i = 0;
          while (i < bytes.length) {
            var c = bytes[i];
            if (c < 128) {
              result.push(String.fromCharCode(c));
              i++;
            } else if (c > 191 && c < 224) {
              result.push(String.fromCharCode((c & 31) << 6 | bytes[i + 1] & 63));
              i += 2;
            } else {
              result.push(String.fromCharCode((c & 15) << 12 | (bytes[i + 1] & 63) << 6 | bytes[i + 2] & 63));
              i += 3;
            }
          }
          return result.join("");
        }
        return {
          toBytes,
          fromBytes
        };
      })();
      var convertHex = /* @__PURE__ */ (function() {
        function toBytes(text) {
          var result = [];
          for (var i = 0; i < text.length; i += 2) {
            result.push(parseInt(text.substr(i, 2), 16));
          }
          return result;
        }
        var Hex = "0123456789abcdef";
        function fromBytes(bytes) {
          var result = [];
          for (var i = 0; i < bytes.length; i++) {
            var v = bytes[i];
            result.push(Hex[(v & 240) >> 4] + Hex[v & 15]);
          }
          return result.join("");
        }
        return {
          toBytes,
          fromBytes
        };
      })();
      var numberOfRounds = { 16: 10, 24: 12, 32: 14 };
      var rcon = [1, 2, 4, 8, 16, 32, 64, 128, 27, 54, 108, 216, 171, 77, 154, 47, 94, 188, 99, 198, 151, 53, 106, 212, 179, 125, 250, 239, 197, 145];
      var S = [99, 124, 119, 123, 242, 107, 111, 197, 48, 1, 103, 43, 254, 215, 171, 118, 202, 130, 201, 125, 250, 89, 71, 240, 173, 212, 162, 175, 156, 164, 114, 192, 183, 253, 147, 38, 54, 63, 247, 204, 52, 165, 229, 241, 113, 216, 49, 21, 4, 199, 35, 195, 24, 150, 5, 154, 7, 18, 128, 226, 235, 39, 178, 117, 9, 131, 44, 26, 27, 110, 90, 160, 82, 59, 214, 179, 41, 227, 47, 132, 83, 209, 0, 237, 32, 252, 177, 91, 106, 203, 190, 57, 74, 76, 88, 207, 208, 239, 170, 251, 67, 77, 51, 133, 69, 249, 2, 127, 80, 60, 159, 168, 81, 163, 64, 143, 146, 157, 56, 245, 188, 182, 218, 33, 16, 255, 243, 210, 205, 12, 19, 236, 95, 151, 68, 23, 196, 167, 126, 61, 100, 93, 25, 115, 96, 129, 79, 220, 34, 42, 144, 136, 70, 238, 184, 20, 222, 94, 11, 219, 224, 50, 58, 10, 73, 6, 36, 92, 194, 211, 172, 98, 145, 149, 228, 121, 231, 200, 55, 109, 141, 213, 78, 169, 108, 86, 244, 234, 101, 122, 174, 8, 186, 120, 37, 46, 28, 166, 180, 198, 232, 221, 116, 31, 75, 189, 139, 138, 112, 62, 181, 102, 72, 3, 246, 14, 97, 53, 87, 185, 134, 193, 29, 158, 225, 248, 152, 17, 105, 217, 142, 148, 155, 30, 135, 233, 206, 85, 40, 223, 140, 161, 137, 13, 191, 230, 66, 104, 65, 153, 45, 15, 176, 84, 187, 22];
      var Si = [82, 9, 106, 213, 48, 54, 165, 56, 191, 64, 163, 158, 129, 243, 215, 251, 124, 227, 57, 130, 155, 47, 255, 135, 52, 142, 67, 68, 196, 222, 233, 203, 84, 123, 148, 50, 166, 194, 35, 61, 238, 76, 149, 11, 66, 250, 195, 78, 8, 46, 161, 102, 40, 217, 36, 178, 118, 91, 162, 73, 109, 139, 209, 37, 114, 248, 246, 100, 134, 104, 152, 22, 212, 164, 92, 204, 93, 101, 182, 146, 108, 112, 72, 80, 253, 237, 185, 218, 94, 21, 70, 87, 167, 141, 157, 132, 144, 216, 171, 0, 140, 188, 211, 10, 247, 228, 88, 5, 184, 179, 69, 6, 208, 44, 30, 143, 202, 63, 15, 2, 193, 175, 189, 3, 1, 19, 138, 107, 58, 145, 17, 65, 79, 103, 220, 234, 151, 242, 207, 206, 240, 180, 230, 115, 150, 172, 116, 34, 231, 173, 53, 133, 226, 249, 55, 232, 28, 117, 223, 110, 71, 241, 26, 113, 29, 41, 197, 137, 111, 183, 98, 14, 170, 24, 190, 27, 252, 86, 62, 75, 198, 210, 121, 32, 154, 219, 192, 254, 120, 205, 90, 244, 31, 221, 168, 51, 136, 7, 199, 49, 177, 18, 16, 89, 39, 128, 236, 95, 96, 81, 127, 169, 25, 181, 74, 13, 45, 229, 122, 159, 147, 201, 156, 239, 160, 224, 59, 77, 174, 42, 245, 176, 200, 235, 187, 60, 131, 83, 153, 97, 23, 43, 4, 126, 186, 119, 214, 38, 225, 105, 20, 99, 85, 33, 12, 125];
      var T1 = [3328402341, 4168907908, 4000806809, 4135287693, 4294111757, 3597364157, 3731845041, 2445657428, 1613770832, 33620227, 3462883241, 1445669757, 3892248089, 3050821474, 1303096294, 3967186586, 2412431941, 528646813, 2311702848, 4202528135, 4026202645, 2992200171, 2387036105, 4226871307, 1101901292, 3017069671, 1604494077, 1169141738, 597466303, 1403299063, 3832705686, 2613100635, 1974974402, 3791519004, 1033081774, 1277568618, 1815492186, 2118074177, 4126668546, 2211236943, 1748251740, 1369810420, 3521504564, 4193382664, 3799085459, 2883115123, 1647391059, 706024767, 134480908, 2512897874, 1176707941, 2646852446, 806885416, 932615841, 168101135, 798661301, 235341577, 605164086, 461406363, 3756188221, 3454790438, 1311188841, 2142417613, 3933566367, 302582043, 495158174, 1479289972, 874125870, 907746093, 3698224818, 3025820398, 1537253627, 2756858614, 1983593293, 3084310113, 2108928974, 1378429307, 3722699582, 1580150641, 327451799, 2790478837, 3117535592, 0, 3253595436, 1075847264, 3825007647, 2041688520, 3059440621, 3563743934, 2378943302, 1740553945, 1916352843, 2487896798, 2555137236, 2958579944, 2244988746, 3151024235, 3320835882, 1336584933, 3992714006, 2252555205, 2588757463, 1714631509, 293963156, 2319795663, 3925473552, 67240454, 4269768577, 2689618160, 2017213508, 631218106, 1269344483, 2723238387, 1571005438, 2151694528, 93294474, 1066570413, 563977660, 1882732616, 4059428100, 1673313503, 2008463041, 2950355573, 1109467491, 537923632, 3858759450, 4260623118, 3218264685, 2177748300, 403442708, 638784309, 3287084079, 3193921505, 899127202, 2286175436, 773265209, 2479146071, 1437050866, 4236148354, 2050833735, 3362022572, 3126681063, 840505643, 3866325909, 3227541664, 427917720, 2655997905, 2749160575, 1143087718, 1412049534, 999329963, 193497219, 2353415882, 3354324521, 1807268051, 672404540, 2816401017, 3160301282, 369822493, 2916866934, 3688947771, 1681011286, 1949973070, 336202270, 2454276571, 201721354, 1210328172, 3093060836, 2680341085, 3184776046, 1135389935, 3294782118, 965841320, 831886756, 3554993207, 4068047243, 3588745010, 2345191491, 1849112409, 3664604599, 26054028, 2983581028, 2622377682, 1235855840, 3630984372, 2891339514, 4092916743, 3488279077, 3395642799, 4101667470, 1202630377, 268961816, 1874508501, 4034427016, 1243948399, 1546530418, 941366308, 1470539505, 1941222599, 2546386513, 3421038627, 2715671932, 3899946140, 1042226977, 2521517021, 1639824860, 227249030, 260737669, 3765465232, 2084453954, 1907733956, 3429263018, 2420656344, 100860677, 4160157185, 470683154, 3261161891, 1781871967, 2924959737, 1773779408, 394692241, 2579611992, 974986535, 664706745, 3655459128, 3958962195, 731420851, 571543859, 3530123707, 2849626480, 126783113, 865375399, 765172662, 1008606754, 361203602, 3387549984, 2278477385, 2857719295, 1344809080, 2782912378, 59542671, 1503764984, 160008576, 437062935, 1707065306, 3622233649, 2218934982, 3496503480, 2185314755, 697932208, 1512910199, 504303377, 2075177163, 2824099068, 1841019862, 739644986];
      var T2 = [2781242211, 2230877308, 2582542199, 2381740923, 234877682, 3184946027, 2984144751, 1418839493, 1348481072, 50462977, 2848876391, 2102799147, 434634494, 1656084439, 3863849899, 2599188086, 1167051466, 2636087938, 1082771913, 2281340285, 368048890, 3954334041, 3381544775, 201060592, 3963727277, 1739838676, 4250903202, 3930435503, 3206782108, 4149453988, 2531553906, 1536934080, 3262494647, 484572669, 2923271059, 1783375398, 1517041206, 1098792767, 49674231, 1334037708, 1550332980, 4098991525, 886171109, 150598129, 2481090929, 1940642008, 1398944049, 1059722517, 201851908, 1385547719, 1699095331, 1587397571, 674240536, 2704774806, 252314885, 3039795866, 151914247, 908333586, 2602270848, 1038082786, 651029483, 1766729511, 3447698098, 2682942837, 454166793, 2652734339, 1951935532, 775166490, 758520603, 3000790638, 4004797018, 4217086112, 4137964114, 1299594043, 1639438038, 3464344499, 2068982057, 1054729187, 1901997871, 2534638724, 4121318227, 1757008337, 0, 750906861, 1614815264, 535035132, 3363418545, 3988151131, 3201591914, 1183697867, 3647454910, 1265776953, 3734260298, 3566750796, 3903871064, 1250283471, 1807470800, 717615087, 3847203498, 384695291, 3313910595, 3617213773, 1432761139, 2484176261, 3481945413, 283769337, 100925954, 2180939647, 4037038160, 1148730428, 3123027871, 3813386408, 4087501137, 4267549603, 3229630528, 2315620239, 2906624658, 3156319645, 1215313976, 82966005, 3747855548, 3245848246, 1974459098, 1665278241, 807407632, 451280895, 251524083, 1841287890, 1283575245, 337120268, 891687699, 801369324, 3787349855, 2721421207, 3431482436, 959321879, 1469301956, 4065699751, 2197585534, 1199193405, 2898814052, 3887750493, 724703513, 2514908019, 2696962144, 2551808385, 3516813135, 2141445340, 1715741218, 2119445034, 2872807568, 2198571144, 3398190662, 700968686, 3547052216, 1009259540, 2041044702, 3803995742, 487983883, 1991105499, 1004265696, 1449407026, 1316239930, 504629770, 3683797321, 168560134, 1816667172, 3837287516, 1570751170, 1857934291, 4014189740, 2797888098, 2822345105, 2754712981, 936633572, 2347923833, 852879335, 1133234376, 1500395319, 3084545389, 2348912013, 1689376213, 3533459022, 3762923945, 3034082412, 4205598294, 133428468, 634383082, 2949277029, 2398386810, 3913789102, 403703816, 3580869306, 2297460856, 1867130149, 1918643758, 607656988, 4049053350, 3346248884, 1368901318, 600565992, 2090982877, 2632479860, 557719327, 3717614411, 3697393085, 2249034635, 2232388234, 2430627952, 1115438654, 3295786421, 2865522278, 3633334344, 84280067, 33027830, 303828494, 2747425121, 1600795957, 4188952407, 3496589753, 2434238086, 1486471617, 658119965, 3106381470, 953803233, 334231800, 3005978776, 857870609, 3151128937, 1890179545, 2298973838, 2805175444, 3056442267, 574365214, 2450884487, 550103529, 1233637070, 4289353045, 2018519080, 2057691103, 2399374476, 4166623649, 2148108681, 387583245, 3664101311, 836232934, 3330556482, 3100665960, 3280093505, 2955516313, 2002398509, 287182607, 3413881008, 4238890068, 3597515707, 975967766];
      var T3 = [1671808611, 2089089148, 2006576759, 2072901243, 4061003762, 1807603307, 1873927791, 3310653893, 810573872, 16974337, 1739181671, 729634347, 4263110654, 3613570519, 2883997099, 1989864566, 3393556426, 2191335298, 3376449993, 2106063485, 4195741690, 1508618841, 1204391495, 4027317232, 2917941677, 3563566036, 2734514082, 2951366063, 2629772188, 2767672228, 1922491506, 3227229120, 3082974647, 4246528509, 2477669779, 644500518, 911895606, 1061256767, 4144166391, 3427763148, 878471220, 2784252325, 3845444069, 4043897329, 1905517169, 3631459288, 827548209, 356461077, 67897348, 3344078279, 593839651, 3277757891, 405286936, 2527147926, 84871685, 2595565466, 118033927, 305538066, 2157648768, 3795705826, 3945188843, 661212711, 2999812018, 1973414517, 152769033, 2208177539, 745822252, 439235610, 455947803, 1857215598, 1525593178, 2700827552, 1391895634, 994932283, 3596728278, 3016654259, 695947817, 3812548067, 795958831, 2224493444, 1408607827, 3513301457, 0, 3979133421, 543178784, 4229948412, 2982705585, 1542305371, 1790891114, 3410398667, 3201918910, 961245753, 1256100938, 1289001036, 1491644504, 3477767631, 3496721360, 4012557807, 2867154858, 4212583931, 1137018435, 1305975373, 861234739, 2241073541, 1171229253, 4178635257, 33948674, 2139225727, 1357946960, 1011120188, 2679776671, 2833468328, 1374921297, 2751356323, 1086357568, 2408187279, 2460827538, 2646352285, 944271416, 4110742005, 3168756668, 3066132406, 3665145818, 560153121, 271589392, 4279952895, 4077846003, 3530407890, 3444343245, 202643468, 322250259, 3962553324, 1608629855, 2543990167, 1154254916, 389623319, 3294073796, 2817676711, 2122513534, 1028094525, 1689045092, 1575467613, 422261273, 1939203699, 1621147744, 2174228865, 1339137615, 3699352540, 577127458, 712922154, 2427141008, 2290289544, 1187679302, 3995715566, 3100863416, 339486740, 3732514782, 1591917662, 186455563, 3681988059, 3762019296, 844522546, 978220090, 169743370, 1239126601, 101321734, 611076132, 1558493276, 3260915650, 3547250131, 2901361580, 1655096418, 2443721105, 2510565781, 3828863972, 2039214713, 3878868455, 3359869896, 928607799, 1840765549, 2374762893, 3580146133, 1322425422, 2850048425, 1823791212, 1459268694, 4094161908, 3928346602, 1706019429, 2056189050, 2934523822, 135794696, 3134549946, 2022240376, 628050469, 779246638, 472135708, 2800834470, 3032970164, 3327236038, 3894660072, 3715932637, 1956440180, 522272287, 1272813131, 3185336765, 2340818315, 2323976074, 1888542832, 1044544574, 3049550261, 1722469478, 1222152264, 50660867, 4127324150, 236067854, 1638122081, 895445557, 1475980887, 3117443513, 2257655686, 3243809217, 489110045, 2662934430, 3778599393, 4162055160, 2561878936, 288563729, 1773916777, 3648039385, 2391345038, 2493985684, 2612407707, 505560094, 2274497927, 3911240169, 3460925390, 1442818645, 678973480, 3749357023, 2358182796, 2717407649, 2306869641, 219617805, 3218761151, 3862026214, 1120306242, 1756942440, 1103331905, 2578459033, 762796589, 252780047, 2966125488, 1425844308, 3151392187, 372911126];
      var T4 = [1667474886, 2088535288, 2004326894, 2071694838, 4075949567, 1802223062, 1869591006, 3318043793, 808472672, 16843522, 1734846926, 724270422, 4278065639, 3621216949, 2880169549, 1987484396, 3402253711, 2189597983, 3385409673, 2105378810, 4210693615, 1499065266, 1195886990, 4042263547, 2913856577, 3570689971, 2728590687, 2947541573, 2627518243, 2762274643, 1920112356, 3233831835, 3082273397, 4261223649, 2475929149, 640051788, 909531756, 1061110142, 4160160501, 3435941763, 875846760, 2779116625, 3857003729, 4059105529, 1903268834, 3638064043, 825316194, 353713962, 67374088, 3351728789, 589522246, 3284360861, 404236336, 2526454071, 84217610, 2593830191, 117901582, 303183396, 2155911963, 3806477791, 3958056653, 656894286, 2998062463, 1970642922, 151591698, 2206440989, 741110872, 437923380, 454765878, 1852748508, 1515908788, 2694904667, 1381168804, 993742198, 3604373943, 3014905469, 690584402, 3823320797, 791638366, 2223281939, 1398011302, 3520161977, 0, 3991743681, 538992704, 4244381667, 2981218425, 1532751286, 1785380564, 3419096717, 3200178535, 960056178, 1246420628, 1280103576, 1482221744, 3486468741, 3503319995, 4025428677, 2863326543, 4227536621, 1128514950, 1296947098, 859002214, 2240123921, 1162203018, 4193849577, 33687044, 2139062782, 1347481760, 1010582648, 2678045221, 2829640523, 1364325282, 2745433693, 1077985408, 2408548869, 2459086143, 2644360225, 943212656, 4126475505, 3166494563, 3065430391, 3671750063, 555836226, 269496352, 4294908645, 4092792573, 3537006015, 3452783745, 202118168, 320025894, 3974901699, 1600119230, 2543297077, 1145359496, 387397934, 3301201811, 2812801621, 2122220284, 1027426170, 1684319432, 1566435258, 421079858, 1936954854, 1616945344, 2172753945, 1330631070, 3705438115, 572679748, 707427924, 2425400123, 2290647819, 1179044492, 4008585671, 3099120491, 336870440, 3739122087, 1583276732, 185277718, 3688593069, 3772791771, 842159716, 976899700, 168435220, 1229577106, 101059084, 606366792, 1549591736, 3267517855, 3553849021, 2897014595, 1650632388, 2442242105, 2509612081, 3840161747, 2038008818, 3890688725, 3368567691, 926374254, 1835907034, 2374863873, 3587531953, 1313788572, 2846482505, 1819063512, 1448540844, 4109633523, 3941213647, 1701162954, 2054852340, 2930698567, 134748176, 3132806511, 2021165296, 623210314, 774795868, 471606328, 2795958615, 3031746419, 3334885783, 3907527627, 3722280097, 1953799400, 522133822, 1263263126, 3183336545, 2341176845, 2324333839, 1886425312, 1044267644, 3048588401, 1718004428, 1212733584, 50529542, 4143317495, 235803164, 1633788866, 892690282, 1465383342, 3115962473, 2256965911, 3250673817, 488449850, 2661202215, 3789633753, 4177007595, 2560144171, 286339874, 1768537042, 3654906025, 2391705863, 2492770099, 2610673197, 505291324, 2273808917, 3924369609, 3469625735, 1431699370, 673740880, 3755965093, 2358021891, 2711746649, 2307489801, 218961690, 3217021541, 3873845719, 1111672452, 1751693520, 1094828930, 2576986153, 757954394, 252645662, 2964376443, 1414855848, 3149649517, 370555436];
      var T5 = [1374988112, 2118214995, 437757123, 975658646, 1001089995, 530400753, 2902087851, 1273168787, 540080725, 2910219766, 2295101073, 4110568485, 1340463100, 3307916247, 641025152, 3043140495, 3736164937, 632953703, 1172967064, 1576976609, 3274667266, 2169303058, 2370213795, 1809054150, 59727847, 361929877, 3211623147, 2505202138, 3569255213, 1484005843, 1239443753, 2395588676, 1975683434, 4102977912, 2572697195, 666464733, 3202437046, 4035489047, 3374361702, 2110667444, 1675577880, 3843699074, 2538681184, 1649639237, 2976151520, 3144396420, 4269907996, 4178062228, 1883793496, 2403728665, 2497604743, 1383856311, 2876494627, 1917518562, 3810496343, 1716890410, 3001755655, 800440835, 2261089178, 3543599269, 807962610, 599762354, 33778362, 3977675356, 2328828971, 2809771154, 4077384432, 1315562145, 1708848333, 101039829, 3509871135, 3299278474, 875451293, 2733856160, 92987698, 2767645557, 193195065, 1080094634, 1584504582, 3178106961, 1042385657, 2531067453, 3711829422, 1306967366, 2438237621, 1908694277, 67556463, 1615861247, 429456164, 3602770327, 2302690252, 1742315127, 2968011453, 126454664, 3877198648, 2043211483, 2709260871, 2084704233, 4169408201, 0, 159417987, 841739592, 504459436, 1817866830, 4245618683, 260388950, 1034867998, 908933415, 168810852, 1750902305, 2606453969, 607530554, 202008497, 2472011535, 3035535058, 463180190, 2160117071, 1641816226, 1517767529, 470948374, 3801332234, 3231722213, 1008918595, 303765277, 235474187, 4069246893, 766945465, 337553864, 1475418501, 2943682380, 4003061179, 2743034109, 4144047775, 1551037884, 1147550661, 1543208500, 2336434550, 3408119516, 3069049960, 3102011747, 3610369226, 1113818384, 328671808, 2227573024, 2236228733, 3535486456, 2935566865, 3341394285, 496906059, 3702665459, 226906860, 2009195472, 733156972, 2842737049, 294930682, 1206477858, 2835123396, 2700099354, 1451044056, 573804783, 2269728455, 3644379585, 2362090238, 2564033334, 2801107407, 2776292904, 3669462566, 1068351396, 742039012, 1350078989, 1784663195, 1417561698, 4136440770, 2430122216, 775550814, 2193862645, 2673705150, 1775276924, 1876241833, 3475313331, 3366754619, 270040487, 3902563182, 3678124923, 3441850377, 1851332852, 3969562369, 2203032232, 3868552805, 2868897406, 566021896, 4011190502, 3135740889, 1248802510, 3936291284, 699432150, 832877231, 708780849, 3332740144, 899835584, 1951317047, 4236429990, 3767586992, 866637845, 4043610186, 1106041591, 2144161806, 395441711, 1984812685, 1139781709, 3433712980, 3835036895, 2664543715, 1282050075, 3240894392, 1181045119, 2640243204, 25965917, 4203181171, 4211818798, 3009879386, 2463879762, 3910161971, 1842759443, 2597806476, 933301370, 1509430414, 3943906441, 3467192302, 3076639029, 3776767469, 2051518780, 2631065433, 1441952575, 404016761, 1942435775, 1408749034, 1610459739, 3745345300, 2017778566, 3400528769, 3110650942, 941896748, 3265478751, 371049330, 3168937228, 675039627, 4279080257, 967311729, 135050206, 3635733660, 1683407248, 2076935265, 3576870512, 1215061108, 3501741890];
      var T6 = [1347548327, 1400783205, 3273267108, 2520393566, 3409685355, 4045380933, 2880240216, 2471224067, 1428173050, 4138563181, 2441661558, 636813900, 4233094615, 3620022987, 2149987652, 2411029155, 1239331162, 1730525723, 2554718734, 3781033664, 46346101, 310463728, 2743944855, 3328955385, 3875770207, 2501218972, 3955191162, 3667219033, 768917123, 3545789473, 692707433, 1150208456, 1786102409, 2029293177, 1805211710, 3710368113, 3065962831, 401639597, 1724457132, 3028143674, 409198410, 2196052529, 1620529459, 1164071807, 3769721975, 2226875310, 486441376, 2499348523, 1483753576, 428819965, 2274680428, 3075636216, 598438867, 3799141122, 1474502543, 711349675, 129166120, 53458370, 2592523643, 2782082824, 4063242375, 2988687269, 3120694122, 1559041666, 730517276, 2460449204, 4042459122, 2706270690, 3446004468, 3573941694, 533804130, 2328143614, 2637442643, 2695033685, 839224033, 1973745387, 957055980, 2856345839, 106852767, 1371368976, 4181598602, 1033297158, 2933734917, 1179510461, 3046200461, 91341917, 1862534868, 4284502037, 605657339, 2547432937, 3431546947, 2003294622, 3182487618, 2282195339, 954669403, 3682191598, 1201765386, 3917234703, 3388507166, 0, 2198438022, 1211247597, 2887651696, 1315723890, 4227665663, 1443857720, 507358933, 657861945, 1678381017, 560487590, 3516619604, 975451694, 2970356327, 261314535, 3535072918, 2652609425, 1333838021, 2724322336, 1767536459, 370938394, 182621114, 3854606378, 1128014560, 487725847, 185469197, 2918353863, 3106780840, 3356761769, 2237133081, 1286567175, 3152976349, 4255350624, 2683765030, 3160175349, 3309594171, 878443390, 1988838185, 3704300486, 1756818940, 1673061617, 3403100636, 272786309, 1075025698, 545572369, 2105887268, 4174560061, 296679730, 1841768865, 1260232239, 4091327024, 3960309330, 3497509347, 1814803222, 2578018489, 4195456072, 575138148, 3299409036, 446754879, 3629546796, 4011996048, 3347532110, 3252238545, 4270639778, 915985419, 3483825537, 681933534, 651868046, 2755636671, 3828103837, 223377554, 2607439820, 1649704518, 3270937875, 3901806776, 1580087799, 4118987695, 3198115200, 2087309459, 2842678573, 3016697106, 1003007129, 2802849917, 1860738147, 2077965243, 164439672, 4100872472, 32283319, 2827177882, 1709610350, 2125135846, 136428751, 3874428392, 3652904859, 3460984630, 3572145929, 3593056380, 2939266226, 824852259, 818324884, 3224740454, 930369212, 2801566410, 2967507152, 355706840, 1257309336, 4148292826, 243256656, 790073846, 2373340630, 1296297904, 1422699085, 3756299780, 3818836405, 457992840, 3099667487, 2135319889, 77422314, 1560382517, 1945798516, 788204353, 1521706781, 1385356242, 870912086, 325965383, 2358957921, 2050466060, 2388260884, 2313884476, 4006521127, 901210569, 3990953189, 1014646705, 1503449823, 1062597235, 2031621326, 3212035895, 3931371469, 1533017514, 350174575, 2256028891, 2177544179, 1052338372, 741876788, 1606591296, 1914052035, 213705253, 2334669897, 1107234197, 1899603969, 3725069491, 2631447780, 2422494913, 1635502980, 1893020342, 1950903388, 1120974935];
      var T7 = [2807058932, 1699970625, 2764249623, 1586903591, 1808481195, 1173430173, 1487645946, 59984867, 4199882800, 1844882806, 1989249228, 1277555970, 3623636965, 3419915562, 1149249077, 2744104290, 1514790577, 459744698, 244860394, 3235995134, 1963115311, 4027744588, 2544078150, 4190530515, 1608975247, 2627016082, 2062270317, 1507497298, 2200818878, 567498868, 1764313568, 3359936201, 2305455554, 2037970062, 1047239e3, 1910319033, 1337376481, 2904027272, 2892417312, 984907214, 1243112415, 830661914, 861968209, 2135253587, 2011214180, 2927934315, 2686254721, 731183368, 1750626376, 4246310725, 1820824798, 4172763771, 3542330227, 48394827, 2404901663, 2871682645, 671593195, 3254988725, 2073724613, 145085239, 2280796200, 2779915199, 1790575107, 2187128086, 472615631, 3029510009, 4075877127, 3802222185, 4107101658, 3201631749, 1646252340, 4270507174, 1402811438, 1436590835, 3778151818, 3950355702, 3963161475, 4020912224, 2667994737, 273792366, 2331590177, 104699613, 95345982, 3175501286, 2377486676, 1560637892, 3564045318, 369057872, 4213447064, 3919042237, 1137477952, 2658625497, 1119727848, 2340947849, 1530455833, 4007360968, 172466556, 266959938, 516552836, 0, 2256734592, 3980931627, 1890328081, 1917742170, 4294704398, 945164165, 3575528878, 958871085, 3647212047, 2787207260, 1423022939, 775562294, 1739656202, 3876557655, 2530391278, 2443058075, 3310321856, 547512796, 1265195639, 437656594, 3121275539, 719700128, 3762502690, 387781147, 218828297, 3350065803, 2830708150, 2848461854, 428169201, 122466165, 3720081049, 1627235199, 648017665, 4122762354, 1002783846, 2117360635, 695634755, 3336358691, 4234721005, 4049844452, 3704280881, 2232435299, 574624663, 287343814, 612205898, 1039717051, 840019705, 2708326185, 793451934, 821288114, 1391201670, 3822090177, 376187827, 3113855344, 1224348052, 1679968233, 2361698556, 1058709744, 752375421, 2431590963, 1321699145, 3519142200, 2734591178, 188127444, 2177869557, 3727205754, 2384911031, 3215212461, 2648976442, 2450346104, 3432737375, 1180849278, 331544205, 3102249176, 4150144569, 2952102595, 2159976285, 2474404304, 766078933, 313773861, 2570832044, 2108100632, 1668212892, 3145456443, 2013908262, 418672217, 3070356634, 2594734927, 1852171925, 3867060991, 3473416636, 3907448597, 2614737639, 919489135, 164948639, 2094410160, 2997825956, 590424639, 2486224549, 1723872674, 3157750862, 3399941250, 3501252752, 3625268135, 2555048196, 3673637356, 1343127501, 4130281361, 3599595085, 2957853679, 1297403050, 81781910, 3051593425, 2283490410, 532201772, 1367295589, 3926170974, 895287692, 1953757831, 1093597963, 492483431, 3528626907, 1446242576, 1192455638, 1636604631, 209336225, 344873464, 1015671571, 669961897, 3375740769, 3857572124, 2973530695, 3747192018, 1933530610, 3464042516, 935293895, 3454686199, 2858115069, 1863638845, 3683022916, 4085369519, 3292445032, 875313188, 1080017571, 3279033885, 621591778, 1233856572, 2504130317, 24197544, 3017672716, 3835484340, 3247465558, 2220981195, 3060847922, 1551124588, 1463996600];
      var T8 = [4104605777, 1097159550, 396673818, 660510266, 2875968315, 2638606623, 4200115116, 3808662347, 821712160, 1986918061, 3430322568, 38544885, 3856137295, 718002117, 893681702, 1654886325, 2975484382, 3122358053, 3926825029, 4274053469, 796197571, 1290801793, 1184342925, 3556361835, 2405426947, 2459735317, 1836772287, 1381620373, 3196267988, 1948373848, 3764988233, 3385345166, 3263785589, 2390325492, 1480485785, 3111247143, 3780097726, 2293045232, 548169417, 3459953789, 3746175075, 439452389, 1362321559, 1400849762, 1685577905, 1806599355, 2174754046, 137073913, 1214797936, 1174215055, 3731654548, 2079897426, 1943217067, 1258480242, 529487843, 1437280870, 3945269170, 3049390895, 3313212038, 923313619, 679998e3, 3215307299, 57326082, 377642221, 3474729866, 2041877159, 133361907, 1776460110, 3673476453, 96392454, 878845905, 2801699524, 777231668, 4082475170, 2330014213, 4142626212, 2213296395, 1626319424, 1906247262, 1846563261, 562755902, 3708173718, 1040559837, 3871163981, 1418573201, 3294430577, 114585348, 1343618912, 2566595609, 3186202582, 1078185097, 3651041127, 3896688048, 2307622919, 425408743, 3371096953, 2081048481, 1108339068, 2216610296, 0, 2156299017, 736970802, 292596766, 1517440620, 251657213, 2235061775, 2933202493, 758720310, 265905162, 1554391400, 1532285339, 908999204, 174567692, 1474760595, 4002861748, 2610011675, 3234156416, 3693126241, 2001430874, 303699484, 2478443234, 2687165888, 585122620, 454499602, 151849742, 2345119218, 3064510765, 514443284, 4044981591, 1963412655, 2581445614, 2137062819, 19308535, 1928707164, 1715193156, 4219352155, 1126790795, 600235211, 3992742070, 3841024952, 836553431, 1669664834, 2535604243, 3323011204, 1243905413, 3141400786, 4180808110, 698445255, 2653899549, 2989552604, 2253581325, 3252932727, 3004591147, 1891211689, 2487810577, 3915653703, 4237083816, 4030667424, 2100090966, 865136418, 1229899655, 953270745, 3399679628, 3557504664, 4118925222, 2061379749, 3079546586, 2915017791, 983426092, 2022837584, 1607244650, 2118541908, 2366882550, 3635996816, 972512814, 3283088770, 1568718495, 3499326569, 3576539503, 621982671, 2895723464, 410887952, 2623762152, 1002142683, 645401037, 1494807662, 2595684844, 1335535747, 2507040230, 4293295786, 3167684641, 367585007, 3885750714, 1865862730, 2668221674, 2960971305, 2763173681, 1059270954, 2777952454, 2724642869, 1320957812, 2194319100, 2429595872, 2815956275, 77089521, 3973773121, 3444575871, 2448830231, 1305906550, 4021308739, 2857194700, 2516901860, 3518358430, 1787304780, 740276417, 1699839814, 1592394909, 2352307457, 2272556026, 188821243, 1729977011, 3687994002, 274084841, 3594982253, 3613494426, 2701949495, 4162096729, 322734571, 2837966542, 1640576439, 484830689, 1202797690, 3537852828, 4067639125, 349075736, 3342319475, 4157467219, 4255800159, 1030690015, 1155237496, 2951971274, 1757691577, 607398968, 2738905026, 499347990, 3794078908, 1011452712, 227885567, 2818666809, 213114376, 3034881240, 1455525988, 3414450555, 850817237, 1817998408, 3092726480];
      var U1 = [0, 235474187, 470948374, 303765277, 941896748, 908933415, 607530554, 708780849, 1883793496, 2118214995, 1817866830, 1649639237, 1215061108, 1181045119, 1417561698, 1517767529, 3767586992, 4003061179, 4236429990, 4069246893, 3635733660, 3602770327, 3299278474, 3400528769, 2430122216, 2664543715, 2362090238, 2193862645, 2835123396, 2801107407, 3035535058, 3135740889, 3678124923, 3576870512, 3341394285, 3374361702, 3810496343, 3977675356, 4279080257, 4043610186, 2876494627, 2776292904, 3076639029, 3110650942, 2472011535, 2640243204, 2403728665, 2169303058, 1001089995, 899835584, 666464733, 699432150, 59727847, 226906860, 530400753, 294930682, 1273168787, 1172967064, 1475418501, 1509430414, 1942435775, 2110667444, 1876241833, 1641816226, 2910219766, 2743034109, 2976151520, 3211623147, 2505202138, 2606453969, 2302690252, 2269728455, 3711829422, 3543599269, 3240894392, 3475313331, 3843699074, 3943906441, 4178062228, 4144047775, 1306967366, 1139781709, 1374988112, 1610459739, 1975683434, 2076935265, 1775276924, 1742315127, 1034867998, 866637845, 566021896, 800440835, 92987698, 193195065, 429456164, 395441711, 1984812685, 2017778566, 1784663195, 1683407248, 1315562145, 1080094634, 1383856311, 1551037884, 101039829, 135050206, 437757123, 337553864, 1042385657, 807962610, 573804783, 742039012, 2531067453, 2564033334, 2328828971, 2227573024, 2935566865, 2700099354, 3001755655, 3168937228, 3868552805, 3902563182, 4203181171, 4102977912, 3736164937, 3501741890, 3265478751, 3433712980, 1106041591, 1340463100, 1576976609, 1408749034, 2043211483, 2009195472, 1708848333, 1809054150, 832877231, 1068351396, 766945465, 599762354, 159417987, 126454664, 361929877, 463180190, 2709260871, 2943682380, 3178106961, 3009879386, 2572697195, 2538681184, 2236228733, 2336434550, 3509871135, 3745345300, 3441850377, 3274667266, 3910161971, 3877198648, 4110568485, 4211818798, 2597806476, 2497604743, 2261089178, 2295101073, 2733856160, 2902087851, 3202437046, 2968011453, 3936291284, 3835036895, 4136440770, 4169408201, 3535486456, 3702665459, 3467192302, 3231722213, 2051518780, 1951317047, 1716890410, 1750902305, 1113818384, 1282050075, 1584504582, 1350078989, 168810852, 67556463, 371049330, 404016761, 841739592, 1008918595, 775550814, 540080725, 3969562369, 3801332234, 4035489047, 4269907996, 3569255213, 3669462566, 3366754619, 3332740144, 2631065433, 2463879762, 2160117071, 2395588676, 2767645557, 2868897406, 3102011747, 3069049960, 202008497, 33778362, 270040487, 504459436, 875451293, 975658646, 675039627, 641025152, 2084704233, 1917518562, 1615861247, 1851332852, 1147550661, 1248802510, 1484005843, 1451044056, 933301370, 967311729, 733156972, 632953703, 260388950, 25965917, 328671808, 496906059, 1206477858, 1239443753, 1543208500, 1441952575, 2144161806, 1908694277, 1675577880, 1842759443, 3610369226, 3644379585, 3408119516, 3307916247, 4011190502, 3776767469, 4077384432, 4245618683, 2809771154, 2842737049, 3144396420, 3043140495, 2673705150, 2438237621, 2203032232, 2370213795];
      var U2 = [0, 185469197, 370938394, 487725847, 741876788, 657861945, 975451694, 824852259, 1483753576, 1400783205, 1315723890, 1164071807, 1950903388, 2135319889, 1649704518, 1767536459, 2967507152, 3152976349, 2801566410, 2918353863, 2631447780, 2547432937, 2328143614, 2177544179, 3901806776, 3818836405, 4270639778, 4118987695, 3299409036, 3483825537, 3535072918, 3652904859, 2077965243, 1893020342, 1841768865, 1724457132, 1474502543, 1559041666, 1107234197, 1257309336, 598438867, 681933534, 901210569, 1052338372, 261314535, 77422314, 428819965, 310463728, 3409685355, 3224740454, 3710368113, 3593056380, 3875770207, 3960309330, 4045380933, 4195456072, 2471224067, 2554718734, 2237133081, 2388260884, 3212035895, 3028143674, 2842678573, 2724322336, 4138563181, 4255350624, 3769721975, 3955191162, 3667219033, 3516619604, 3431546947, 3347532110, 2933734917, 2782082824, 3099667487, 3016697106, 2196052529, 2313884476, 2499348523, 2683765030, 1179510461, 1296297904, 1347548327, 1533017514, 1786102409, 1635502980, 2087309459, 2003294622, 507358933, 355706840, 136428751, 53458370, 839224033, 957055980, 605657339, 790073846, 2373340630, 2256028891, 2607439820, 2422494913, 2706270690, 2856345839, 3075636216, 3160175349, 3573941694, 3725069491, 3273267108, 3356761769, 4181598602, 4063242375, 4011996048, 3828103837, 1033297158, 915985419, 730517276, 545572369, 296679730, 446754879, 129166120, 213705253, 1709610350, 1860738147, 1945798516, 2029293177, 1239331162, 1120974935, 1606591296, 1422699085, 4148292826, 4233094615, 3781033664, 3931371469, 3682191598, 3497509347, 3446004468, 3328955385, 2939266226, 2755636671, 3106780840, 2988687269, 2198438022, 2282195339, 2501218972, 2652609425, 1201765386, 1286567175, 1371368976, 1521706781, 1805211710, 1620529459, 2105887268, 1988838185, 533804130, 350174575, 164439672, 46346101, 870912086, 954669403, 636813900, 788204353, 2358957921, 2274680428, 2592523643, 2441661558, 2695033685, 2880240216, 3065962831, 3182487618, 3572145929, 3756299780, 3270937875, 3388507166, 4174560061, 4091327024, 4006521127, 3854606378, 1014646705, 930369212, 711349675, 560487590, 272786309, 457992840, 106852767, 223377554, 1678381017, 1862534868, 1914052035, 2031621326, 1211247597, 1128014560, 1580087799, 1428173050, 32283319, 182621114, 401639597, 486441376, 768917123, 651868046, 1003007129, 818324884, 1503449823, 1385356242, 1333838021, 1150208456, 1973745387, 2125135846, 1673061617, 1756818940, 2970356327, 3120694122, 2802849917, 2887651696, 2637442643, 2520393566, 2334669897, 2149987652, 3917234703, 3799141122, 4284502037, 4100872472, 3309594171, 3460984630, 3545789473, 3629546796, 2050466060, 1899603969, 1814803222, 1730525723, 1443857720, 1560382517, 1075025698, 1260232239, 575138148, 692707433, 878443390, 1062597235, 243256656, 91341917, 409198410, 325965383, 3403100636, 3252238545, 3704300486, 3620022987, 3874428392, 3990953189, 4042459122, 4227665663, 2460449204, 2578018489, 2226875310, 2411029155, 3198115200, 3046200461, 2827177882, 2743944855];
      var U3 = [0, 218828297, 437656594, 387781147, 875313188, 958871085, 775562294, 590424639, 1750626376, 1699970625, 1917742170, 2135253587, 1551124588, 1367295589, 1180849278, 1265195639, 3501252752, 3720081049, 3399941250, 3350065803, 3835484340, 3919042237, 4270507174, 4085369519, 3102249176, 3051593425, 2734591178, 2952102595, 2361698556, 2177869557, 2530391278, 2614737639, 3145456443, 3060847922, 2708326185, 2892417312, 2404901663, 2187128086, 2504130317, 2555048196, 3542330227, 3727205754, 3375740769, 3292445032, 3876557655, 3926170974, 4246310725, 4027744588, 1808481195, 1723872674, 1910319033, 2094410160, 1608975247, 1391201670, 1173430173, 1224348052, 59984867, 244860394, 428169201, 344873464, 935293895, 984907214, 766078933, 547512796, 1844882806, 1627235199, 2011214180, 2062270317, 1507497298, 1423022939, 1137477952, 1321699145, 95345982, 145085239, 532201772, 313773861, 830661914, 1015671571, 731183368, 648017665, 3175501286, 2957853679, 2807058932, 2858115069, 2305455554, 2220981195, 2474404304, 2658625497, 3575528878, 3625268135, 3473416636, 3254988725, 3778151818, 3963161475, 4213447064, 4130281361, 3599595085, 3683022916, 3432737375, 3247465558, 3802222185, 4020912224, 4172763771, 4122762354, 3201631749, 3017672716, 2764249623, 2848461854, 2331590177, 2280796200, 2431590963, 2648976442, 104699613, 188127444, 472615631, 287343814, 840019705, 1058709744, 671593195, 621591778, 1852171925, 1668212892, 1953757831, 2037970062, 1514790577, 1463996600, 1080017571, 1297403050, 3673637356, 3623636965, 3235995134, 3454686199, 4007360968, 3822090177, 4107101658, 4190530515, 2997825956, 3215212461, 2830708150, 2779915199, 2256734592, 2340947849, 2627016082, 2443058075, 172466556, 122466165, 273792366, 492483431, 1047239e3, 861968209, 612205898, 695634755, 1646252340, 1863638845, 2013908262, 1963115311, 1446242576, 1530455833, 1277555970, 1093597963, 1636604631, 1820824798, 2073724613, 1989249228, 1436590835, 1487645946, 1337376481, 1119727848, 164948639, 81781910, 331544205, 516552836, 1039717051, 821288114, 669961897, 719700128, 2973530695, 3157750862, 2871682645, 2787207260, 2232435299, 2283490410, 2667994737, 2450346104, 3647212047, 3564045318, 3279033885, 3464042516, 3980931627, 3762502690, 4150144569, 4199882800, 3070356634, 3121275539, 2904027272, 2686254721, 2200818878, 2384911031, 2570832044, 2486224549, 3747192018, 3528626907, 3310321856, 3359936201, 3950355702, 3867060991, 4049844452, 4234721005, 1739656202, 1790575107, 2108100632, 1890328081, 1402811438, 1586903591, 1233856572, 1149249077, 266959938, 48394827, 369057872, 418672217, 1002783846, 919489135, 567498868, 752375421, 209336225, 24197544, 376187827, 459744698, 945164165, 895287692, 574624663, 793451934, 1679968233, 1764313568, 2117360635, 1933530610, 1343127501, 1560637892, 1243112415, 1192455638, 3704280881, 3519142200, 3336358691, 3419915562, 3907448597, 3857572124, 4075877127, 4294704398, 3029510009, 3113855344, 2927934315, 2744104290, 2159976285, 2377486676, 2594734927, 2544078150];
      var U4 = [0, 151849742, 303699484, 454499602, 607398968, 758720310, 908999204, 1059270954, 1214797936, 1097159550, 1517440620, 1400849762, 1817998408, 1699839814, 2118541908, 2001430874, 2429595872, 2581445614, 2194319100, 2345119218, 3034881240, 3186202582, 2801699524, 2951971274, 3635996816, 3518358430, 3399679628, 3283088770, 4237083816, 4118925222, 4002861748, 3885750714, 1002142683, 850817237, 698445255, 548169417, 529487843, 377642221, 227885567, 77089521, 1943217067, 2061379749, 1640576439, 1757691577, 1474760595, 1592394909, 1174215055, 1290801793, 2875968315, 2724642869, 3111247143, 2960971305, 2405426947, 2253581325, 2638606623, 2487810577, 3808662347, 3926825029, 4044981591, 4162096729, 3342319475, 3459953789, 3576539503, 3693126241, 1986918061, 2137062819, 1685577905, 1836772287, 1381620373, 1532285339, 1078185097, 1229899655, 1040559837, 923313619, 740276417, 621982671, 439452389, 322734571, 137073913, 19308535, 3871163981, 4021308739, 4104605777, 4255800159, 3263785589, 3414450555, 3499326569, 3651041127, 2933202493, 2815956275, 3167684641, 3049390895, 2330014213, 2213296395, 2566595609, 2448830231, 1305906550, 1155237496, 1607244650, 1455525988, 1776460110, 1626319424, 2079897426, 1928707164, 96392454, 213114376, 396673818, 514443284, 562755902, 679998e3, 865136418, 983426092, 3708173718, 3557504664, 3474729866, 3323011204, 4180808110, 4030667424, 3945269170, 3794078908, 2507040230, 2623762152, 2272556026, 2390325492, 2975484382, 3092726480, 2738905026, 2857194700, 3973773121, 3856137295, 4274053469, 4157467219, 3371096953, 3252932727, 3673476453, 3556361835, 2763173681, 2915017791, 3064510765, 3215307299, 2156299017, 2307622919, 2459735317, 2610011675, 2081048481, 1963412655, 1846563261, 1729977011, 1480485785, 1362321559, 1243905413, 1126790795, 878845905, 1030690015, 645401037, 796197571, 274084841, 425408743, 38544885, 188821243, 3613494426, 3731654548, 3313212038, 3430322568, 4082475170, 4200115116, 3780097726, 3896688048, 2668221674, 2516901860, 2366882550, 2216610296, 3141400786, 2989552604, 2837966542, 2687165888, 1202797690, 1320957812, 1437280870, 1554391400, 1669664834, 1787304780, 1906247262, 2022837584, 265905162, 114585348, 499347990, 349075736, 736970802, 585122620, 972512814, 821712160, 2595684844, 2478443234, 2293045232, 2174754046, 3196267988, 3079546586, 2895723464, 2777952454, 3537852828, 3687994002, 3234156416, 3385345166, 4142626212, 4293295786, 3841024952, 3992742070, 174567692, 57326082, 410887952, 292596766, 777231668, 660510266, 1011452712, 893681702, 1108339068, 1258480242, 1343618912, 1494807662, 1715193156, 1865862730, 1948373848, 2100090966, 2701949495, 2818666809, 3004591147, 3122358053, 2235061775, 2352307457, 2535604243, 2653899549, 3915653703, 3764988233, 4219352155, 4067639125, 3444575871, 3294430577, 3746175075, 3594982253, 836553431, 953270745, 600235211, 718002117, 367585007, 484830689, 133361907, 251657213, 2041877159, 1891211689, 1806599355, 1654886325, 1568718495, 1418573201, 1335535747, 1184342925];
      function convertToInt32(bytes) {
        var result = [];
        for (var i = 0; i < bytes.length; i += 4) {
          result.push(
            bytes[i] << 24 | bytes[i + 1] << 16 | bytes[i + 2] << 8 | bytes[i + 3]
          );
        }
        return result;
      }
      var AES = function(key2) {
        if (!(this instanceof AES)) {
          throw Error("AES must be instanitated with `new`");
        }
        Object.defineProperty(this, "key", {
          value: coerceArray(key2, true)
        });
        this._prepare();
      };
      AES.prototype._prepare = function() {
        var rounds = numberOfRounds[this.key.length];
        if (rounds == null) {
          throw new Error("invalid key size (must be 16, 24 or 32 bytes)");
        }
        this._Ke = [];
        this._Kd = [];
        for (var i = 0; i <= rounds; i++) {
          this._Ke.push([0, 0, 0, 0]);
          this._Kd.push([0, 0, 0, 0]);
        }
        var roundKeyCount = (rounds + 1) * 4;
        var KC = this.key.length / 4;
        var tk = convertToInt32(this.key);
        var index;
        for (var i = 0; i < KC; i++) {
          index = i >> 2;
          this._Ke[index][i % 4] = tk[i];
          this._Kd[rounds - index][i % 4] = tk[i];
        }
        var rconpointer = 0;
        var t = KC, tt;
        while (t < roundKeyCount) {
          tt = tk[KC - 1];
          tk[0] ^= S[tt >> 16 & 255] << 24 ^ S[tt >> 8 & 255] << 16 ^ S[tt & 255] << 8 ^ S[tt >> 24 & 255] ^ rcon[rconpointer] << 24;
          rconpointer += 1;
          if (KC != 8) {
            for (var i = 1; i < KC; i++) {
              tk[i] ^= tk[i - 1];
            }
          } else {
            for (var i = 1; i < KC / 2; i++) {
              tk[i] ^= tk[i - 1];
            }
            tt = tk[KC / 2 - 1];
            tk[KC / 2] ^= S[tt & 255] ^ S[tt >> 8 & 255] << 8 ^ S[tt >> 16 & 255] << 16 ^ S[tt >> 24 & 255] << 24;
            for (var i = KC / 2 + 1; i < KC; i++) {
              tk[i] ^= tk[i - 1];
            }
          }
          var i = 0, r2, c;
          while (i < KC && t < roundKeyCount) {
            r2 = t >> 2;
            c = t % 4;
            this._Ke[r2][c] = tk[i];
            this._Kd[rounds - r2][c] = tk[i++];
            t++;
          }
        }
        for (var r2 = 1; r2 < rounds; r2++) {
          for (var c = 0; c < 4; c++) {
            tt = this._Kd[r2][c];
            this._Kd[r2][c] = U1[tt >> 24 & 255] ^ U2[tt >> 16 & 255] ^ U3[tt >> 8 & 255] ^ U4[tt & 255];
          }
        }
      };
      AES.prototype.encrypt = function(plaintext) {
        if (plaintext.length != 16) {
          throw new Error("invalid plaintext size (must be 16 bytes)");
        }
        var rounds = this._Ke.length - 1;
        var a = [0, 0, 0, 0];
        var t = convertToInt32(plaintext);
        for (var i = 0; i < 4; i++) {
          t[i] ^= this._Ke[0][i];
        }
        for (var r2 = 1; r2 < rounds; r2++) {
          for (var i = 0; i < 4; i++) {
            a[i] = T1[t[i] >> 24 & 255] ^ T2[t[(i + 1) % 4] >> 16 & 255] ^ T3[t[(i + 2) % 4] >> 8 & 255] ^ T4[t[(i + 3) % 4] & 255] ^ this._Ke[r2][i];
          }
          t = a.slice();
        }
        var result = createArray(16), tt;
        for (var i = 0; i < 4; i++) {
          tt = this._Ke[rounds][i];
          result[4 * i] = (S[t[i] >> 24 & 255] ^ tt >> 24) & 255;
          result[4 * i + 1] = (S[t[(i + 1) % 4] >> 16 & 255] ^ tt >> 16) & 255;
          result[4 * i + 2] = (S[t[(i + 2) % 4] >> 8 & 255] ^ tt >> 8) & 255;
          result[4 * i + 3] = (S[t[(i + 3) % 4] & 255] ^ tt) & 255;
        }
        return result;
      };
      AES.prototype.decrypt = function(ciphertext) {
        if (ciphertext.length != 16) {
          throw new Error("invalid ciphertext size (must be 16 bytes)");
        }
        var rounds = this._Kd.length - 1;
        var a = [0, 0, 0, 0];
        var t = convertToInt32(ciphertext);
        for (var i = 0; i < 4; i++) {
          t[i] ^= this._Kd[0][i];
        }
        for (var r2 = 1; r2 < rounds; r2++) {
          for (var i = 0; i < 4; i++) {
            a[i] = T5[t[i] >> 24 & 255] ^ T6[t[(i + 3) % 4] >> 16 & 255] ^ T7[t[(i + 2) % 4] >> 8 & 255] ^ T8[t[(i + 1) % 4] & 255] ^ this._Kd[r2][i];
          }
          t = a.slice();
        }
        var result = createArray(16), tt;
        for (var i = 0; i < 4; i++) {
          tt = this._Kd[rounds][i];
          result[4 * i] = (Si[t[i] >> 24 & 255] ^ tt >> 24) & 255;
          result[4 * i + 1] = (Si[t[(i + 3) % 4] >> 16 & 255] ^ tt >> 16) & 255;
          result[4 * i + 2] = (Si[t[(i + 2) % 4] >> 8 & 255] ^ tt >> 8) & 255;
          result[4 * i + 3] = (Si[t[(i + 1) % 4] & 255] ^ tt) & 255;
        }
        return result;
      };
      var ModeOfOperationECB = function(key2) {
        if (!(this instanceof ModeOfOperationECB)) {
          throw Error("AES must be instanitated with `new`");
        }
        this.description = "Electronic Code Block";
        this.name = "ecb";
        this._aes = new AES(key2);
      };
      ModeOfOperationECB.prototype.encrypt = function(plaintext) {
        plaintext = coerceArray(plaintext);
        if (plaintext.length % 16 !== 0) {
          throw new Error("invalid plaintext size (must be multiple of 16 bytes)");
        }
        var ciphertext = createArray(plaintext.length);
        var block = createArray(16);
        for (var i = 0; i < plaintext.length; i += 16) {
          copyArray(plaintext, block, 0, i, i + 16);
          block = this._aes.encrypt(block);
          copyArray(block, ciphertext, i);
        }
        return ciphertext;
      };
      ModeOfOperationECB.prototype.decrypt = function(ciphertext) {
        ciphertext = coerceArray(ciphertext);
        if (ciphertext.length % 16 !== 0) {
          throw new Error("invalid ciphertext size (must be multiple of 16 bytes)");
        }
        var plaintext = createArray(ciphertext.length);
        var block = createArray(16);
        for (var i = 0; i < ciphertext.length; i += 16) {
          copyArray(ciphertext, block, 0, i, i + 16);
          block = this._aes.decrypt(block);
          copyArray(block, plaintext, i);
        }
        return plaintext;
      };
      var ModeOfOperationCBC = function(key2, iv) {
        if (!(this instanceof ModeOfOperationCBC)) {
          throw Error("AES must be instanitated with `new`");
        }
        this.description = "Cipher Block Chaining";
        this.name = "cbc";
        if (!iv) {
          iv = createArray(16);
        } else if (iv.length != 16) {
          throw new Error("invalid initialation vector size (must be 16 bytes)");
        }
        this._lastCipherblock = coerceArray(iv, true);
        this._aes = new AES(key2);
      };
      ModeOfOperationCBC.prototype.encrypt = function(plaintext) {
        plaintext = coerceArray(plaintext);
        if (plaintext.length % 16 !== 0) {
          throw new Error("invalid plaintext size (must be multiple of 16 bytes)");
        }
        var ciphertext = createArray(plaintext.length);
        var block = createArray(16);
        for (var i = 0; i < plaintext.length; i += 16) {
          copyArray(plaintext, block, 0, i, i + 16);
          for (var j = 0; j < 16; j++) {
            block[j] ^= this._lastCipherblock[j];
          }
          this._lastCipherblock = this._aes.encrypt(block);
          copyArray(this._lastCipherblock, ciphertext, i);
        }
        return ciphertext;
      };
      ModeOfOperationCBC.prototype.decrypt = function(ciphertext) {
        ciphertext = coerceArray(ciphertext);
        if (ciphertext.length % 16 !== 0) {
          throw new Error("invalid ciphertext size (must be multiple of 16 bytes)");
        }
        var plaintext = createArray(ciphertext.length);
        var block = createArray(16);
        for (var i = 0; i < ciphertext.length; i += 16) {
          copyArray(ciphertext, block, 0, i, i + 16);
          block = this._aes.decrypt(block);
          for (var j = 0; j < 16; j++) {
            plaintext[i + j] = block[j] ^ this._lastCipherblock[j];
          }
          copyArray(ciphertext, this._lastCipherblock, 0, i, i + 16);
        }
        return plaintext;
      };
      var ModeOfOperationCFB = function(key2, iv, segmentSize) {
        if (!(this instanceof ModeOfOperationCFB)) {
          throw Error("AES must be instanitated with `new`");
        }
        this.description = "Cipher Feedback";
        this.name = "cfb";
        if (!iv) {
          iv = createArray(16);
        } else if (iv.length != 16) {
          throw new Error("invalid initialation vector size (must be 16 size)");
        }
        if (!segmentSize) {
          segmentSize = 1;
        }
        this.segmentSize = segmentSize;
        this._shiftRegister = coerceArray(iv, true);
        this._aes = new AES(key2);
      };
      ModeOfOperationCFB.prototype.encrypt = function(plaintext) {
        if (plaintext.length % this.segmentSize != 0) {
          throw new Error("invalid plaintext size (must be segmentSize bytes)");
        }
        var encrypted = coerceArray(plaintext, true);
        var xorSegment;
        for (var i = 0; i < encrypted.length; i += this.segmentSize) {
          xorSegment = this._aes.encrypt(this._shiftRegister);
          for (var j = 0; j < this.segmentSize; j++) {
            encrypted[i + j] ^= xorSegment[j];
          }
          copyArray(this._shiftRegister, this._shiftRegister, 0, this.segmentSize);
          copyArray(encrypted, this._shiftRegister, 16 - this.segmentSize, i, i + this.segmentSize);
        }
        return encrypted;
      };
      ModeOfOperationCFB.prototype.decrypt = function(ciphertext) {
        if (ciphertext.length % this.segmentSize != 0) {
          throw new Error("invalid ciphertext size (must be segmentSize bytes)");
        }
        var plaintext = coerceArray(ciphertext, true);
        var xorSegment;
        for (var i = 0; i < plaintext.length; i += this.segmentSize) {
          xorSegment = this._aes.encrypt(this._shiftRegister);
          for (var j = 0; j < this.segmentSize; j++) {
            plaintext[i + j] ^= xorSegment[j];
          }
          copyArray(this._shiftRegister, this._shiftRegister, 0, this.segmentSize);
          copyArray(ciphertext, this._shiftRegister, 16 - this.segmentSize, i, i + this.segmentSize);
        }
        return plaintext;
      };
      var ModeOfOperationOFB = function(key2, iv) {
        if (!(this instanceof ModeOfOperationOFB)) {
          throw Error("AES must be instanitated with `new`");
        }
        this.description = "Output Feedback";
        this.name = "ofb";
        if (!iv) {
          iv = createArray(16);
        } else if (iv.length != 16) {
          throw new Error("invalid initialation vector size (must be 16 bytes)");
        }
        this._lastPrecipher = coerceArray(iv, true);
        this._lastPrecipherIndex = 16;
        this._aes = new AES(key2);
      };
      ModeOfOperationOFB.prototype.encrypt = function(plaintext) {
        var encrypted = coerceArray(plaintext, true);
        for (var i = 0; i < encrypted.length; i++) {
          if (this._lastPrecipherIndex === 16) {
            this._lastPrecipher = this._aes.encrypt(this._lastPrecipher);
            this._lastPrecipherIndex = 0;
          }
          encrypted[i] ^= this._lastPrecipher[this._lastPrecipherIndex++];
        }
        return encrypted;
      };
      ModeOfOperationOFB.prototype.decrypt = ModeOfOperationOFB.prototype.encrypt;
      var Counter = function(initialValue) {
        if (!(this instanceof Counter)) {
          throw Error("Counter must be instanitated with `new`");
        }
        if (initialValue !== 0 && !initialValue) {
          initialValue = 1;
        }
        if (typeof initialValue === "number") {
          this._counter = createArray(16);
          this.setValue(initialValue);
        } else {
          this.setBytes(initialValue);
        }
      };
      Counter.prototype.setValue = function(value) {
        if (typeof value !== "number" || parseInt(value) != value) {
          throw new Error("invalid counter value (must be an integer)");
        }
        for (var index = 15; index >= 0; --index) {
          this._counter[index] = value % 256;
          value = value >> 8;
        }
      };
      Counter.prototype.setBytes = function(bytes) {
        bytes = coerceArray(bytes, true);
        if (bytes.length != 16) {
          throw new Error("invalid counter bytes size (must be 16 bytes)");
        }
        this._counter = bytes;
      };
      Counter.prototype.increment = function() {
        for (var i = 15; i >= 0; i--) {
          if (this._counter[i] === 255) {
            this._counter[i] = 0;
          } else {
            this._counter[i]++;
            break;
          }
        }
      };
      var ModeOfOperationCTR = function(key2, counter) {
        if (!(this instanceof ModeOfOperationCTR)) {
          throw Error("AES must be instanitated with `new`");
        }
        this.description = "Counter";
        this.name = "ctr";
        if (!(counter instanceof Counter)) {
          counter = new Counter(counter);
        }
        this._counter = counter;
        this._remainingCounter = null;
        this._remainingCounterIndex = 16;
        this._aes = new AES(key2);
      };
      ModeOfOperationCTR.prototype.encrypt = function(plaintext) {
        var encrypted = coerceArray(plaintext, true);
        for (var i = 0; i < encrypted.length; i++) {
          if (this._remainingCounterIndex === 16) {
            this._remainingCounter = this._aes.encrypt(this._counter._counter);
            this._remainingCounterIndex = 0;
            this._counter.increment();
          }
          encrypted[i] ^= this._remainingCounter[this._remainingCounterIndex++];
        }
        return encrypted;
      };
      ModeOfOperationCTR.prototype.decrypt = ModeOfOperationCTR.prototype.encrypt;
      function pkcs7pad(data) {
        data = coerceArray(data, true);
        var padder = 16 - data.length % 16;
        var result = createArray(data.length + padder);
        copyArray(data, result);
        for (var i = data.length; i < result.length; i++) {
          result[i] = padder;
        }
        return result;
      }
      function pkcs7strip(data) {
        data = coerceArray(data, true);
        if (data.length < 16) {
          throw new Error("PKCS#7 invalid length");
        }
        var padder = data[data.length - 1];
        if (padder > 16) {
          throw new Error("PKCS#7 padding byte out of range");
        }
        var length = data.length - padder;
        for (var i = 0; i < padder; i++) {
          if (data[length + i] !== padder) {
            throw new Error("PKCS#7 invalid padding byte");
          }
        }
        var result = createArray(length);
        copyArray(data, result, 0, 0, length);
        return result;
      }
      var aesjs = {
        AES,
        Counter,
        ModeOfOperation: {
          ecb: ModeOfOperationECB,
          cbc: ModeOfOperationCBC,
          cfb: ModeOfOperationCFB,
          ofb: ModeOfOperationOFB,
          ctr: ModeOfOperationCTR
        },
        utils: {
          hex: convertHex,
          utf8: convertUtf8
        },
        padding: {
          pkcs7: {
            pad: pkcs7pad,
            strip: pkcs7strip
          }
        },
        _arrayTest: {
          coerceArray,
          createArray,
          copyArray
        }
      };
      if (typeof exports !== "undefined") {
        module.exports = aesjs;
      } else if (typeof define === "function" && define.amd) {
        define(aesjs);
      } else {
        if (root.aesjs) {
          aesjs._aesjs = root.aesjs;
        }
        root.aesjs = aesjs;
      }
    })(exports);
  }
});

// ../../node_modules/@ethersproject/json-wallets/lib.esm/_version.js
var version15;
var init_version15 = __esm({
  "../../node_modules/@ethersproject/json-wallets/lib.esm/_version.js"() {
    "use strict";
    version15 = "json-wallets/5.8.0";
  }
});

// ../../node_modules/@ethersproject/json-wallets/lib.esm/utils.js
function looseArrayify(hexString) {
  if (typeof hexString === "string" && hexString.substring(0, 2) !== "0x") {
    hexString = "0x" + hexString;
  }
  return arrayify(hexString);
}
function zpad(value, length) {
  value = String(value);
  while (value.length < length) {
    value = "0" + value;
  }
  return value;
}
function getPassword(password) {
  if (typeof password === "string") {
    return toUtf8Bytes(password, UnicodeNormalizationForm.NFKC);
  }
  return arrayify(password);
}
function searchPath(object, path) {
  let currentChild = object;
  const comps = path.toLowerCase().split("/");
  for (let i = 0; i < comps.length; i++) {
    let matchingChild = null;
    for (const key2 in currentChild) {
      if (key2.toLowerCase() === comps[i]) {
        matchingChild = currentChild[key2];
        break;
      }
    }
    if (matchingChild === null) {
      return null;
    }
    currentChild = matchingChild;
  }
  return currentChild;
}
function uuidV4(randomBytes2) {
  const bytes = arrayify(randomBytes2);
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const value = hexlify(bytes);
  return [
    value.substring(2, 10),
    value.substring(10, 14),
    value.substring(14, 18),
    value.substring(18, 22),
    value.substring(22, 34)
  ].join("-");
}
var init_utils = __esm({
  "../../node_modules/@ethersproject/json-wallets/lib.esm/utils.js"() {
    "use strict";
    init_lib2();
    init_lib9();
  }
});

// ../../node_modules/@ethersproject/json-wallets/lib.esm/crowdsale.js
function decrypt(json, password) {
  const data = JSON.parse(json);
  password = getPassword(password);
  const ethaddr = getAddress(searchPath(data, "ethaddr"));
  const encseed = looseArrayify(searchPath(data, "encseed"));
  if (!encseed || encseed.length % 16 !== 0) {
    logger20.throwArgumentError("invalid encseed", "json", json);
  }
  const key2 = arrayify(pbkdf2(password, password, 2e3, 32, "sha256")).slice(0, 16);
  const iv = encseed.slice(0, 16);
  const encryptedSeed = encseed.slice(16);
  const aesCbc = new import_aes_js.default.ModeOfOperation.cbc(key2, iv);
  const seed = import_aes_js.default.padding.pkcs7.strip(arrayify(aesCbc.decrypt(encryptedSeed)));
  let seedHex = "";
  for (let i = 0; i < seed.length; i++) {
    seedHex += String.fromCharCode(seed[i]);
  }
  const seedHexBytes = toUtf8Bytes(seedHex);
  const privateKey = keccak256(seedHexBytes);
  return new CrowdsaleAccount({
    _isCrowdsaleAccount: true,
    address: ethaddr,
    privateKey
  });
}
var import_aes_js, logger20, CrowdsaleAccount;
var init_crowdsale = __esm({
  "../../node_modules/@ethersproject/json-wallets/lib.esm/crowdsale.js"() {
    "use strict";
    import_aes_js = __toESM(require_aes_js());
    init_lib7();
    init_lib2();
    init_lib5();
    init_lib16();
    init_lib9();
    init_lib4();
    init_lib();
    init_version15();
    init_utils();
    logger20 = new Logger(version15);
    CrowdsaleAccount = class extends Description {
      isCrowdsaleAccount(value) {
        return !!(value && value._isCrowdsaleAccount);
      }
    };
  }
});

// ../../node_modules/@ethersproject/json-wallets/lib.esm/inspect.js
function isCrowdsaleWallet(json) {
  let data = null;
  try {
    data = JSON.parse(json);
  } catch (error) {
    return false;
  }
  return data.encseed && data.ethaddr;
}
function isKeystoreWallet(json) {
  let data = null;
  try {
    data = JSON.parse(json);
  } catch (error) {
    return false;
  }
  if (!data.version || parseInt(data.version) !== data.version || parseInt(data.version) !== 3) {
    return false;
  }
  return true;
}
function getJsonWalletAddress(json) {
  if (isCrowdsaleWallet(json)) {
    try {
      return getAddress(JSON.parse(json).ethaddr);
    } catch (error) {
      return null;
    }
  }
  if (isKeystoreWallet(json)) {
    try {
      return getAddress(JSON.parse(json).address);
    } catch (error) {
      return null;
    }
  }
  return null;
}
var init_inspect = __esm({
  "../../node_modules/@ethersproject/json-wallets/lib.esm/inspect.js"() {
    "use strict";
    init_lib7();
  }
});

// ../../node_modules/scrypt-js/scrypt.js
var require_scrypt = __commonJS({
  "../../node_modules/scrypt-js/scrypt.js"(exports, module) {
    "use strict";
    (function(root) {
      const MAX_VALUE = 2147483647;
      function SHA256(m) {
        const K = new Uint32Array([
          1116352408,
          1899447441,
          3049323471,
          3921009573,
          961987163,
          1508970993,
          2453635748,
          2870763221,
          3624381080,
          310598401,
          607225278,
          1426881987,
          1925078388,
          2162078206,
          2614888103,
          3248222580,
          3835390401,
          4022224774,
          264347078,
          604807628,
          770255983,
          1249150122,
          1555081692,
          1996064986,
          2554220882,
          2821834349,
          2952996808,
          3210313671,
          3336571891,
          3584528711,
          113926993,
          338241895,
          666307205,
          773529912,
          1294757372,
          1396182291,
          1695183700,
          1986661051,
          2177026350,
          2456956037,
          2730485921,
          2820302411,
          3259730800,
          3345764771,
          3516065817,
          3600352804,
          4094571909,
          275423344,
          430227734,
          506948616,
          659060556,
          883997877,
          958139571,
          1322822218,
          1537002063,
          1747873779,
          1955562222,
          2024104815,
          2227730452,
          2361852424,
          2428436474,
          2756734187,
          3204031479,
          3329325298
        ]);
        let h0 = 1779033703, h1 = 3144134277, h2 = 1013904242, h3 = 2773480762;
        let h4 = 1359893119, h5 = 2600822924, h6 = 528734635, h7 = 1541459225;
        const w = new Uint32Array(64);
        function blocks(p2) {
          let off = 0, len = p2.length;
          while (len >= 64) {
            let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7, u, i2, j, t1, t2;
            for (i2 = 0; i2 < 16; i2++) {
              j = off + i2 * 4;
              w[i2] = (p2[j] & 255) << 24 | (p2[j + 1] & 255) << 16 | (p2[j + 2] & 255) << 8 | p2[j + 3] & 255;
            }
            for (i2 = 16; i2 < 64; i2++) {
              u = w[i2 - 2];
              t1 = (u >>> 17 | u << 32 - 17) ^ (u >>> 19 | u << 32 - 19) ^ u >>> 10;
              u = w[i2 - 15];
              t2 = (u >>> 7 | u << 32 - 7) ^ (u >>> 18 | u << 32 - 18) ^ u >>> 3;
              w[i2] = (t1 + w[i2 - 7] | 0) + (t2 + w[i2 - 16] | 0) | 0;
            }
            for (i2 = 0; i2 < 64; i2++) {
              t1 = (((e >>> 6 | e << 32 - 6) ^ (e >>> 11 | e << 32 - 11) ^ (e >>> 25 | e << 32 - 25)) + (e & f ^ ~e & g) | 0) + (h + (K[i2] + w[i2] | 0) | 0) | 0;
              t2 = ((a >>> 2 | a << 32 - 2) ^ (a >>> 13 | a << 32 - 13) ^ (a >>> 22 | a << 32 - 22)) + (a & b ^ a & c ^ b & c) | 0;
              h = g;
              g = f;
              f = e;
              e = d + t1 | 0;
              d = c;
              c = b;
              b = a;
              a = t1 + t2 | 0;
            }
            h0 = h0 + a | 0;
            h1 = h1 + b | 0;
            h2 = h2 + c | 0;
            h3 = h3 + d | 0;
            h4 = h4 + e | 0;
            h5 = h5 + f | 0;
            h6 = h6 + g | 0;
            h7 = h7 + h | 0;
            off += 64;
            len -= 64;
          }
        }
        blocks(m);
        let i, bytesLeft = m.length % 64, bitLenHi = m.length / 536870912 | 0, bitLenLo = m.length << 3, numZeros = bytesLeft < 56 ? 56 : 120, p = m.slice(m.length - bytesLeft, m.length);
        p.push(128);
        for (i = bytesLeft + 1; i < numZeros; i++) {
          p.push(0);
        }
        p.push(bitLenHi >>> 24 & 255);
        p.push(bitLenHi >>> 16 & 255);
        p.push(bitLenHi >>> 8 & 255);
        p.push(bitLenHi >>> 0 & 255);
        p.push(bitLenLo >>> 24 & 255);
        p.push(bitLenLo >>> 16 & 255);
        p.push(bitLenLo >>> 8 & 255);
        p.push(bitLenLo >>> 0 & 255);
        blocks(p);
        return [
          h0 >>> 24 & 255,
          h0 >>> 16 & 255,
          h0 >>> 8 & 255,
          h0 >>> 0 & 255,
          h1 >>> 24 & 255,
          h1 >>> 16 & 255,
          h1 >>> 8 & 255,
          h1 >>> 0 & 255,
          h2 >>> 24 & 255,
          h2 >>> 16 & 255,
          h2 >>> 8 & 255,
          h2 >>> 0 & 255,
          h3 >>> 24 & 255,
          h3 >>> 16 & 255,
          h3 >>> 8 & 255,
          h3 >>> 0 & 255,
          h4 >>> 24 & 255,
          h4 >>> 16 & 255,
          h4 >>> 8 & 255,
          h4 >>> 0 & 255,
          h5 >>> 24 & 255,
          h5 >>> 16 & 255,
          h5 >>> 8 & 255,
          h5 >>> 0 & 255,
          h6 >>> 24 & 255,
          h6 >>> 16 & 255,
          h6 >>> 8 & 255,
          h6 >>> 0 & 255,
          h7 >>> 24 & 255,
          h7 >>> 16 & 255,
          h7 >>> 8 & 255,
          h7 >>> 0 & 255
        ];
      }
      function PBKDF2_HMAC_SHA256_OneIter(password, salt, dkLen) {
        password = password.length <= 64 ? password : SHA256(password);
        const innerLen = 64 + salt.length + 4;
        const inner = new Array(innerLen);
        const outerKey = new Array(64);
        let i;
        let dk = [];
        for (i = 0; i < 64; i++) {
          inner[i] = 54;
        }
        for (i = 0; i < password.length; i++) {
          inner[i] ^= password[i];
        }
        for (i = 0; i < salt.length; i++) {
          inner[64 + i] = salt[i];
        }
        for (i = innerLen - 4; i < innerLen; i++) {
          inner[i] = 0;
        }
        for (i = 0; i < 64; i++) outerKey[i] = 92;
        for (i = 0; i < password.length; i++) outerKey[i] ^= password[i];
        function incrementCounter() {
          for (let i2 = innerLen - 1; i2 >= innerLen - 4; i2--) {
            inner[i2]++;
            if (inner[i2] <= 255) return;
            inner[i2] = 0;
          }
        }
        while (dkLen >= 32) {
          incrementCounter();
          dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))));
          dkLen -= 32;
        }
        if (dkLen > 0) {
          incrementCounter();
          dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))).slice(0, dkLen));
        }
        return dk;
      }
      function blockmix_salsa8(BY, Yi, r2, x, _X) {
        let i;
        arraycopy(BY, (2 * r2 - 1) * 16, _X, 0, 16);
        for (i = 0; i < 2 * r2; i++) {
          blockxor(BY, i * 16, _X, 16);
          salsa20_8(_X, x);
          arraycopy(_X, 0, BY, Yi + i * 16, 16);
        }
        for (i = 0; i < r2; i++) {
          arraycopy(BY, Yi + i * 2 * 16, BY, i * 16, 16);
        }
        for (i = 0; i < r2; i++) {
          arraycopy(BY, Yi + (i * 2 + 1) * 16, BY, (i + r2) * 16, 16);
        }
      }
      function R(a, b) {
        return a << b | a >>> 32 - b;
      }
      function salsa20_8(B, x) {
        arraycopy(B, 0, x, 0, 16);
        for (let i = 8; i > 0; i -= 2) {
          x[4] ^= R(x[0] + x[12], 7);
          x[8] ^= R(x[4] + x[0], 9);
          x[12] ^= R(x[8] + x[4], 13);
          x[0] ^= R(x[12] + x[8], 18);
          x[9] ^= R(x[5] + x[1], 7);
          x[13] ^= R(x[9] + x[5], 9);
          x[1] ^= R(x[13] + x[9], 13);
          x[5] ^= R(x[1] + x[13], 18);
          x[14] ^= R(x[10] + x[6], 7);
          x[2] ^= R(x[14] + x[10], 9);
          x[6] ^= R(x[2] + x[14], 13);
          x[10] ^= R(x[6] + x[2], 18);
          x[3] ^= R(x[15] + x[11], 7);
          x[7] ^= R(x[3] + x[15], 9);
          x[11] ^= R(x[7] + x[3], 13);
          x[15] ^= R(x[11] + x[7], 18);
          x[1] ^= R(x[0] + x[3], 7);
          x[2] ^= R(x[1] + x[0], 9);
          x[3] ^= R(x[2] + x[1], 13);
          x[0] ^= R(x[3] + x[2], 18);
          x[6] ^= R(x[5] + x[4], 7);
          x[7] ^= R(x[6] + x[5], 9);
          x[4] ^= R(x[7] + x[6], 13);
          x[5] ^= R(x[4] + x[7], 18);
          x[11] ^= R(x[10] + x[9], 7);
          x[8] ^= R(x[11] + x[10], 9);
          x[9] ^= R(x[8] + x[11], 13);
          x[10] ^= R(x[9] + x[8], 18);
          x[12] ^= R(x[15] + x[14], 7);
          x[13] ^= R(x[12] + x[15], 9);
          x[14] ^= R(x[13] + x[12], 13);
          x[15] ^= R(x[14] + x[13], 18);
        }
        for (let i = 0; i < 16; ++i) {
          B[i] += x[i];
        }
      }
      function blockxor(S, Si, D, len) {
        for (let i = 0; i < len; i++) {
          D[i] ^= S[Si + i];
        }
      }
      function arraycopy(src, srcPos, dest, destPos, length) {
        while (length--) {
          dest[destPos++] = src[srcPos++];
        }
      }
      function checkBufferish(o) {
        if (!o || typeof o.length !== "number") {
          return false;
        }
        for (let i = 0; i < o.length; i++) {
          const v = o[i];
          if (typeof v !== "number" || v % 1 || v < 0 || v >= 256) {
            return false;
          }
        }
        return true;
      }
      function ensureInteger(value, name) {
        if (typeof value !== "number" || value % 1) {
          throw new Error("invalid " + name);
        }
        return value;
      }
      function _scrypt(password, salt, N2, r2, p, dkLen, callback) {
        N2 = ensureInteger(N2, "N");
        r2 = ensureInteger(r2, "r");
        p = ensureInteger(p, "p");
        dkLen = ensureInteger(dkLen, "dkLen");
        if (N2 === 0 || (N2 & N2 - 1) !== 0) {
          throw new Error("N must be power of 2");
        }
        if (N2 > MAX_VALUE / 128 / r2) {
          throw new Error("N too large");
        }
        if (r2 > MAX_VALUE / 128 / p) {
          throw new Error("r too large");
        }
        if (!checkBufferish(password)) {
          throw new Error("password must be an array or buffer");
        }
        password = Array.prototype.slice.call(password);
        if (!checkBufferish(salt)) {
          throw new Error("salt must be an array or buffer");
        }
        salt = Array.prototype.slice.call(salt);
        let b = PBKDF2_HMAC_SHA256_OneIter(password, salt, p * 128 * r2);
        const B = new Uint32Array(p * 32 * r2);
        for (let i = 0; i < B.length; i++) {
          const j = i * 4;
          B[i] = (b[j + 3] & 255) << 24 | (b[j + 2] & 255) << 16 | (b[j + 1] & 255) << 8 | (b[j + 0] & 255) << 0;
        }
        const XY = new Uint32Array(64 * r2);
        const V = new Uint32Array(32 * r2 * N2);
        const Yi = 32 * r2;
        const x = new Uint32Array(16);
        const _X = new Uint32Array(16);
        const totalOps = p * N2 * 2;
        let currentOp = 0;
        let lastPercent10 = null;
        let stop = false;
        let state = 0;
        let i0 = 0, i1;
        let Bi;
        const limit = callback ? parseInt(1e3 / r2) : 4294967295;
        const nextTick = typeof setImmediate !== "undefined" ? setImmediate : setTimeout;
        const incrementalSMix = function() {
          if (stop) {
            return callback(new Error("cancelled"), currentOp / totalOps);
          }
          let steps;
          switch (state) {
            case 0:
              Bi = i0 * 32 * r2;
              arraycopy(B, Bi, XY, 0, Yi);
              state = 1;
              i1 = 0;
            // Fall through
            case 1:
              steps = N2 - i1;
              if (steps > limit) {
                steps = limit;
              }
              for (let i = 0; i < steps; i++) {
                arraycopy(XY, 0, V, (i1 + i) * Yi, Yi);
                blockmix_salsa8(XY, Yi, r2, x, _X);
              }
              i1 += steps;
              currentOp += steps;
              if (callback) {
                const percent10 = parseInt(1e3 * currentOp / totalOps);
                if (percent10 !== lastPercent10) {
                  stop = callback(null, currentOp / totalOps);
                  if (stop) {
                    break;
                  }
                  lastPercent10 = percent10;
                }
              }
              if (i1 < N2) {
                break;
              }
              i1 = 0;
              state = 2;
            // Fall through
            case 2:
              steps = N2 - i1;
              if (steps > limit) {
                steps = limit;
              }
              for (let i = 0; i < steps; i++) {
                const offset = (2 * r2 - 1) * 16;
                const j = XY[offset] & N2 - 1;
                blockxor(V, j * Yi, XY, Yi);
                blockmix_salsa8(XY, Yi, r2, x, _X);
              }
              i1 += steps;
              currentOp += steps;
              if (callback) {
                const percent10 = parseInt(1e3 * currentOp / totalOps);
                if (percent10 !== lastPercent10) {
                  stop = callback(null, currentOp / totalOps);
                  if (stop) {
                    break;
                  }
                  lastPercent10 = percent10;
                }
              }
              if (i1 < N2) {
                break;
              }
              arraycopy(XY, 0, B, Bi, Yi);
              i0++;
              if (i0 < p) {
                state = 0;
                break;
              }
              b = [];
              for (let i = 0; i < B.length; i++) {
                b.push(B[i] >> 0 & 255);
                b.push(B[i] >> 8 & 255);
                b.push(B[i] >> 16 & 255);
                b.push(B[i] >> 24 & 255);
              }
              const derivedKey = PBKDF2_HMAC_SHA256_OneIter(password, b, dkLen);
              if (callback) {
                callback(null, 1, derivedKey);
              }
              return derivedKey;
          }
          if (callback) {
            nextTick(incrementalSMix);
          }
        };
        if (!callback) {
          while (true) {
            const derivedKey = incrementalSMix();
            if (derivedKey != void 0) {
              return derivedKey;
            }
          }
        }
        incrementalSMix();
      }
      const lib = {
        scrypt: function(password, salt, N2, r2, p, dkLen, progressCallback) {
          return new Promise(function(resolve, reject) {
            let lastProgress = 0;
            if (progressCallback) {
              progressCallback(0);
            }
            _scrypt(password, salt, N2, r2, p, dkLen, function(error, progress, key2) {
              if (error) {
                reject(error);
              } else if (key2) {
                if (progressCallback && lastProgress !== 1) {
                  progressCallback(1);
                }
                resolve(new Uint8Array(key2));
              } else if (progressCallback && progress !== lastProgress) {
                lastProgress = progress;
                return progressCallback(progress);
              }
            });
          });
        },
        syncScrypt: function(password, salt, N2, r2, p, dkLen) {
          return new Uint8Array(_scrypt(password, salt, N2, r2, p, dkLen));
        }
      };
      if (typeof exports !== "undefined") {
        module.exports = lib;
      } else if (typeof define === "function" && define.amd) {
        define(lib);
      } else if (root) {
        if (root.scrypt) {
          root._scrypt = root.scrypt;
        }
        root.scrypt = lib;
      }
    })(exports);
  }
});

// ../../node_modules/@ethersproject/random/lib.esm/_version.js
var version16;
var init_version16 = __esm({
  "../../node_modules/@ethersproject/random/lib.esm/_version.js"() {
    "use strict";
    version16 = "random/5.8.0";
  }
});

// ../../node_modules/@ethersproject/random/lib.esm/random.js
function getGlobal() {
  if (typeof self !== "undefined") {
    return self;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  throw new Error("unable to locate global object");
}
function randomBytes(length) {
  if (length <= 0 || length > 1024 || length % 1 || length != length) {
    logger21.throwArgumentError("invalid length", "length", length);
  }
  const result = new Uint8Array(length);
  crypto.getRandomValues(result);
  return arrayify(result);
}
var logger21, anyGlobal, crypto;
var init_random = __esm({
  "../../node_modules/@ethersproject/random/lib.esm/random.js"() {
    "use strict";
    init_lib2();
    init_lib();
    init_version16();
    logger21 = new Logger(version16);
    anyGlobal = getGlobal();
    crypto = anyGlobal.crypto || anyGlobal.msCrypto;
    if (!crypto || !crypto.getRandomValues) {
      logger21.warn("WARNING: Missing strong random number source");
      crypto = {
        getRandomValues: function(buffer) {
          return logger21.throwError("no secure random source avaialble", Logger.errors.UNSUPPORTED_OPERATION, {
            operation: "crypto.getRandomValues"
          });
        }
      };
    }
  }
});

// ../../node_modules/@ethersproject/random/lib.esm/shuffle.js
function shuffled(array) {
  array = array.slice();
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
  return array;
}
var init_shuffle = __esm({
  "../../node_modules/@ethersproject/random/lib.esm/shuffle.js"() {
    "use strict";
  }
});

// ../../node_modules/@ethersproject/random/lib.esm/index.js
var lib_exports16 = {};
__export(lib_exports16, {
  randomBytes: () => randomBytes,
  shuffled: () => shuffled
});
var init_lib21 = __esm({
  "../../node_modules/@ethersproject/random/lib.esm/index.js"() {
    "use strict";
    init_random();
    init_shuffle();
  }
});

// ../../node_modules/@ethersproject/json-wallets/lib.esm/keystore.js
function hasMnemonic(value) {
  return value != null && value.mnemonic && value.mnemonic.phrase;
}
function _decrypt(data, key2, ciphertext) {
  const cipher = searchPath(data, "crypto/cipher");
  if (cipher === "aes-128-ctr") {
    const iv = looseArrayify(searchPath(data, "crypto/cipherparams/iv"));
    const counter = new import_aes_js2.default.Counter(iv);
    const aesCtr = new import_aes_js2.default.ModeOfOperation.ctr(key2, counter);
    return arrayify(aesCtr.decrypt(ciphertext));
  }
  return null;
}
function _getAccount(data, key2) {
  const ciphertext = looseArrayify(searchPath(data, "crypto/ciphertext"));
  const computedMAC = hexlify(keccak256(concat([key2.slice(16, 32), ciphertext]))).substring(2);
  if (computedMAC !== searchPath(data, "crypto/mac").toLowerCase()) {
    throw new Error("invalid password");
  }
  const privateKey = _decrypt(data, key2.slice(0, 16), ciphertext);
  if (!privateKey) {
    logger22.throwError("unsupported cipher", Logger.errors.UNSUPPORTED_OPERATION, {
      operation: "decrypt"
    });
  }
  const mnemonicKey = key2.slice(32, 64);
  const address = computeAddress(privateKey);
  if (data.address) {
    let check = data.address.toLowerCase();
    if (check.substring(0, 2) !== "0x") {
      check = "0x" + check;
    }
    if (getAddress(check) !== address) {
      throw new Error("address mismatch");
    }
  }
  const account = {
    _isKeystoreAccount: true,
    address,
    privateKey: hexlify(privateKey)
  };
  if (searchPath(data, "x-ethers/version") === "0.1") {
    const mnemonicCiphertext = looseArrayify(searchPath(data, "x-ethers/mnemonicCiphertext"));
    const mnemonicIv = looseArrayify(searchPath(data, "x-ethers/mnemonicCounter"));
    const mnemonicCounter = new import_aes_js2.default.Counter(mnemonicIv);
    const mnemonicAesCtr = new import_aes_js2.default.ModeOfOperation.ctr(mnemonicKey, mnemonicCounter);
    const path = searchPath(data, "x-ethers/path") || defaultPath;
    const locale = searchPath(data, "x-ethers/locale") || "en";
    const entropy = arrayify(mnemonicAesCtr.decrypt(mnemonicCiphertext));
    try {
      const mnemonic = entropyToMnemonic(entropy, locale);
      const node = HDNode.fromMnemonic(mnemonic, null, locale).derivePath(path);
      if (node.privateKey != account.privateKey) {
        throw new Error("mnemonic mismatch");
      }
      account.mnemonic = node.mnemonic;
    } catch (error) {
      if (error.code !== Logger.errors.INVALID_ARGUMENT || error.argument !== "wordlist") {
        throw error;
      }
    }
  }
  return new KeystoreAccount(account);
}
function pbkdf2Sync(passwordBytes, salt, count, dkLen, prfFunc) {
  return arrayify(pbkdf2(passwordBytes, salt, count, dkLen, prfFunc));
}
function pbkdf22(passwordBytes, salt, count, dkLen, prfFunc) {
  return Promise.resolve(pbkdf2Sync(passwordBytes, salt, count, dkLen, prfFunc));
}
function _computeKdfKey(data, password, pbkdf2Func, scryptFunc, progressCallback) {
  const passwordBytes = getPassword(password);
  const kdf = searchPath(data, "crypto/kdf");
  if (kdf && typeof kdf === "string") {
    const throwError = function(name, value) {
      return logger22.throwArgumentError("invalid key-derivation function parameters", name, value);
    };
    if (kdf.toLowerCase() === "scrypt") {
      const salt = looseArrayify(searchPath(data, "crypto/kdfparams/salt"));
      const N2 = parseInt(searchPath(data, "crypto/kdfparams/n"));
      const r2 = parseInt(searchPath(data, "crypto/kdfparams/r"));
      const p = parseInt(searchPath(data, "crypto/kdfparams/p"));
      if (!N2 || !r2 || !p) {
        throwError("kdf", kdf);
      }
      if ((N2 & N2 - 1) !== 0) {
        throwError("N", N2);
      }
      const dkLen = parseInt(searchPath(data, "crypto/kdfparams/dklen"));
      if (dkLen !== 32) {
        throwError("dklen", dkLen);
      }
      return scryptFunc(passwordBytes, salt, N2, r2, p, 64, progressCallback);
    } else if (kdf.toLowerCase() === "pbkdf2") {
      const salt = looseArrayify(searchPath(data, "crypto/kdfparams/salt"));
      let prfFunc = null;
      const prf = searchPath(data, "crypto/kdfparams/prf");
      if (prf === "hmac-sha256") {
        prfFunc = "sha256";
      } else if (prf === "hmac-sha512") {
        prfFunc = "sha512";
      } else {
        throwError("prf", prf);
      }
      const count = parseInt(searchPath(data, "crypto/kdfparams/c"));
      const dkLen = parseInt(searchPath(data, "crypto/kdfparams/dklen"));
      if (dkLen !== 32) {
        throwError("dklen", dkLen);
      }
      return pbkdf2Func(passwordBytes, salt, count, dkLen, prfFunc);
    }
  }
  return logger22.throwArgumentError("unsupported key-derivation function", "kdf", kdf);
}
function decryptSync(json, password) {
  const data = JSON.parse(json);
  const key2 = _computeKdfKey(data, password, pbkdf2Sync, import_scrypt_js.default.syncScrypt);
  return _getAccount(data, key2);
}
function decrypt2(json, password, progressCallback) {
  return __awaiter3(this, void 0, void 0, function* () {
    const data = JSON.parse(json);
    const key2 = yield _computeKdfKey(data, password, pbkdf22, import_scrypt_js.default.scrypt, progressCallback);
    return _getAccount(data, key2);
  });
}
function encrypt(account, password, options, progressCallback) {
  try {
    if (getAddress(account.address) !== computeAddress(account.privateKey)) {
      throw new Error("address/privateKey mismatch");
    }
    if (hasMnemonic(account)) {
      const mnemonic = account.mnemonic;
      const node = HDNode.fromMnemonic(mnemonic.phrase, null, mnemonic.locale).derivePath(mnemonic.path || defaultPath);
      if (node.privateKey != account.privateKey) {
        throw new Error("mnemonic mismatch");
      }
    }
  } catch (e) {
    return Promise.reject(e);
  }
  if (typeof options === "function" && !progressCallback) {
    progressCallback = options;
    options = {};
  }
  if (!options) {
    options = {};
  }
  const privateKey = arrayify(account.privateKey);
  const passwordBytes = getPassword(password);
  let entropy = null;
  let path = null;
  let locale = null;
  if (hasMnemonic(account)) {
    const srcMnemonic = account.mnemonic;
    entropy = arrayify(mnemonicToEntropy(srcMnemonic.phrase, srcMnemonic.locale || "en"));
    path = srcMnemonic.path || defaultPath;
    locale = srcMnemonic.locale || "en";
  }
  let client = options.client;
  if (!client) {
    client = "ethers.js";
  }
  let salt = null;
  if (options.salt) {
    salt = arrayify(options.salt);
  } else {
    salt = randomBytes(32);
    ;
  }
  let iv = null;
  if (options.iv) {
    iv = arrayify(options.iv);
    if (iv.length !== 16) {
      throw new Error("invalid iv");
    }
  } else {
    iv = randomBytes(16);
  }
  let uuidRandom = null;
  if (options.uuid) {
    uuidRandom = arrayify(options.uuid);
    if (uuidRandom.length !== 16) {
      throw new Error("invalid uuid");
    }
  } else {
    uuidRandom = randomBytes(16);
  }
  let N2 = 1 << 17, r2 = 8, p = 1;
  if (options.scrypt) {
    if (options.scrypt.N) {
      N2 = options.scrypt.N;
    }
    if (options.scrypt.r) {
      r2 = options.scrypt.r;
    }
    if (options.scrypt.p) {
      p = options.scrypt.p;
    }
  }
  return import_scrypt_js.default.scrypt(passwordBytes, salt, N2, r2, p, 64, progressCallback).then((key2) => {
    key2 = arrayify(key2);
    const derivedKey = key2.slice(0, 16);
    const macPrefix = key2.slice(16, 32);
    const mnemonicKey = key2.slice(32, 64);
    const counter = new import_aes_js2.default.Counter(iv);
    const aesCtr = new import_aes_js2.default.ModeOfOperation.ctr(derivedKey, counter);
    const ciphertext = arrayify(aesCtr.encrypt(privateKey));
    const mac = keccak256(concat([macPrefix, ciphertext]));
    const data = {
      address: account.address.substring(2).toLowerCase(),
      id: uuidV4(uuidRandom),
      version: 3,
      crypto: {
        cipher: "aes-128-ctr",
        cipherparams: {
          iv: hexlify(iv).substring(2)
        },
        ciphertext: hexlify(ciphertext).substring(2),
        kdf: "scrypt",
        kdfparams: {
          salt: hexlify(salt).substring(2),
          n: N2,
          dklen: 32,
          p,
          r: r2
        },
        mac: mac.substring(2)
      }
    };
    if (entropy) {
      const mnemonicIv = randomBytes(16);
      const mnemonicCounter = new import_aes_js2.default.Counter(mnemonicIv);
      const mnemonicAesCtr = new import_aes_js2.default.ModeOfOperation.ctr(mnemonicKey, mnemonicCounter);
      const mnemonicCiphertext = arrayify(mnemonicAesCtr.encrypt(entropy));
      const now = /* @__PURE__ */ new Date();
      const timestamp = now.getUTCFullYear() + "-" + zpad(now.getUTCMonth() + 1, 2) + "-" + zpad(now.getUTCDate(), 2) + "T" + zpad(now.getUTCHours(), 2) + "-" + zpad(now.getUTCMinutes(), 2) + "-" + zpad(now.getUTCSeconds(), 2) + ".0Z";
      data["x-ethers"] = {
        client,
        gethFilename: "UTC--" + timestamp + "--" + data.address,
        mnemonicCounter: hexlify(mnemonicIv).substring(2),
        mnemonicCiphertext: hexlify(mnemonicCiphertext).substring(2),
        path,
        locale,
        version: "0.1"
      };
    }
    return JSON.stringify(data);
  });
}
var import_aes_js2, import_scrypt_js, __awaiter3, logger22, KeystoreAccount;
var init_keystore = __esm({
  "../../node_modules/@ethersproject/json-wallets/lib.esm/keystore.js"() {
    "use strict";
    import_aes_js2 = __toESM(require_aes_js());
    import_scrypt_js = __toESM(require_scrypt());
    init_lib7();
    init_lib2();
    init_lib20();
    init_lib5();
    init_lib16();
    init_lib21();
    init_lib4();
    init_lib18();
    init_utils();
    init_lib();
    init_version15();
    __awaiter3 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    logger22 = new Logger(version15);
    KeystoreAccount = class extends Description {
      isKeystoreAccount(value) {
        return !!(value && value._isKeystoreAccount);
      }
    };
  }
});

// ../../node_modules/@ethersproject/json-wallets/lib.esm/index.js
var lib_exports17 = {};
__export(lib_exports17, {
  decryptCrowdsale: () => decrypt,
  decryptJsonWallet: () => decryptJsonWallet,
  decryptJsonWalletSync: () => decryptJsonWalletSync,
  decryptKeystore: () => decrypt2,
  decryptKeystoreSync: () => decryptSync,
  encryptKeystore: () => encrypt,
  getJsonWalletAddress: () => getJsonWalletAddress,
  isCrowdsaleWallet: () => isCrowdsaleWallet,
  isKeystoreWallet: () => isKeystoreWallet
});
function decryptJsonWallet(json, password, progressCallback) {
  if (isCrowdsaleWallet(json)) {
    if (progressCallback) {
      progressCallback(0);
    }
    const account = decrypt(json, password);
    if (progressCallback) {
      progressCallback(1);
    }
    return Promise.resolve(account);
  }
  if (isKeystoreWallet(json)) {
    return decrypt2(json, password, progressCallback);
  }
  return Promise.reject(new Error("invalid JSON wallet"));
}
function decryptJsonWalletSync(json, password) {
  if (isCrowdsaleWallet(json)) {
    return decrypt(json, password);
  }
  if (isKeystoreWallet(json)) {
    return decryptSync(json, password);
  }
  throw new Error("invalid JSON wallet");
}
var init_lib22 = __esm({
  "../../node_modules/@ethersproject/json-wallets/lib.esm/index.js"() {
    "use strict";
    init_crowdsale();
    init_inspect();
    init_keystore();
  }
});

// ../../node_modules/@ethersproject/solidity/lib.esm/_version.js
var version17;
var init_version17 = __esm({
  "../../node_modules/@ethersproject/solidity/lib.esm/_version.js"() {
    "use strict";
    version17 = "solidity/5.8.0";
  }
});

// ../../node_modules/@ethersproject/solidity/lib.esm/index.js
var lib_exports18 = {};
__export(lib_exports18, {
  keccak256: () => keccak2562,
  pack: () => pack2,
  sha256: () => sha2562
});
function _pack(type, value, isArray) {
  switch (type) {
    case "address":
      if (isArray) {
        return zeroPad(value, 32);
      }
      return arrayify(value);
    case "string":
      return toUtf8Bytes(value);
    case "bytes":
      return arrayify(value);
    case "bool":
      value = value ? "0x01" : "0x00";
      if (isArray) {
        return zeroPad(value, 32);
      }
      return arrayify(value);
  }
  let match = type.match(regexNumber);
  if (match) {
    let size = parseInt(match[2] || "256");
    if (match[2] && String(size) !== match[2] || size % 8 !== 0 || size === 0 || size > 256) {
      logger23.throwArgumentError("invalid number type", "type", type);
    }
    if (isArray) {
      size = 256;
    }
    value = BigNumber.from(value).toTwos(size);
    return zeroPad(value, size / 8);
  }
  match = type.match(regexBytes);
  if (match) {
    const size = parseInt(match[1]);
    if (String(size) !== match[1] || size === 0 || size > 32) {
      logger23.throwArgumentError("invalid bytes type", "type", type);
    }
    if (arrayify(value).byteLength !== size) {
      logger23.throwArgumentError(`invalid value for ${type}`, "value", value);
    }
    if (isArray) {
      return arrayify((value + Zeros2).substring(0, 66));
    }
    return value;
  }
  match = type.match(regexArray);
  if (match && Array.isArray(value)) {
    const baseType = match[1];
    const count = parseInt(match[2] || String(value.length));
    if (count != value.length) {
      logger23.throwArgumentError(`invalid array length for ${type}`, "value", value);
    }
    const result = [];
    value.forEach(function(value2) {
      result.push(_pack(baseType, value2, true));
    });
    return concat(result);
  }
  return logger23.throwArgumentError("invalid type", "type", type);
}
function pack2(types, values) {
  if (types.length != values.length) {
    logger23.throwArgumentError("wrong number of values; expected ${ types.length }", "values", values);
  }
  const tight = [];
  types.forEach(function(type, index) {
    tight.push(_pack(type, values[index]));
  });
  return hexlify(concat(tight));
}
function keccak2562(types, values) {
  return keccak256(pack2(types, values));
}
function sha2562(types, values) {
  return sha256(pack2(types, values));
}
var regexBytes, regexNumber, regexArray, Zeros2, logger23;
var init_lib23 = __esm({
  "../../node_modules/@ethersproject/solidity/lib.esm/index.js"() {
    "use strict";
    init_lib3();
    init_lib2();
    init_lib5();
    init_lib15();
    init_lib9();
    init_lib();
    init_version17();
    regexBytes = new RegExp("^bytes([0-9]+)$");
    regexNumber = new RegExp("^(u?int)([0-9]*)$");
    regexArray = new RegExp("^(.*)\\[([0-9]*)\\]$");
    Zeros2 = "0000000000000000000000000000000000000000000000000000000000000000";
    logger23 = new Logger(version17);
  }
});

// ../../node_modules/@ethersproject/units/lib.esm/_version.js
var version18;
var init_version18 = __esm({
  "../../node_modules/@ethersproject/units/lib.esm/_version.js"() {
    "use strict";
    version18 = "units/5.8.0";
  }
});

// ../../node_modules/@ethersproject/units/lib.esm/index.js
var lib_exports19 = {};
__export(lib_exports19, {
  commify: () => commify,
  formatEther: () => formatEther,
  formatUnits: () => formatUnits,
  parseEther: () => parseEther,
  parseUnits: () => parseUnits
});
function commify(value) {
  const comps = String(value).split(".");
  if (comps.length > 2 || !comps[0].match(/^-?[0-9]*$/) || comps[1] && !comps[1].match(/^[0-9]*$/) || value === "." || value === "-.") {
    logger24.throwArgumentError("invalid value", "value", value);
  }
  let whole = comps[0];
  let negative = "";
  if (whole.substring(0, 1) === "-") {
    negative = "-";
    whole = whole.substring(1);
  }
  while (whole.substring(0, 1) === "0") {
    whole = whole.substring(1);
  }
  if (whole === "") {
    whole = "0";
  }
  let suffix = "";
  if (comps.length === 2) {
    suffix = "." + (comps[1] || "0");
  }
  while (suffix.length > 2 && suffix[suffix.length - 1] === "0") {
    suffix = suffix.substring(0, suffix.length - 1);
  }
  const formatted = [];
  while (whole.length) {
    if (whole.length <= 3) {
      formatted.unshift(whole);
      break;
    } else {
      const index = whole.length - 3;
      formatted.unshift(whole.substring(index));
      whole = whole.substring(0, index);
    }
  }
  return negative + formatted.join(",") + suffix;
}
function formatUnits(value, unitName) {
  if (typeof unitName === "string") {
    const index = names.indexOf(unitName);
    if (index !== -1) {
      unitName = 3 * index;
    }
  }
  return formatFixed(value, unitName != null ? unitName : 18);
}
function parseUnits(value, unitName) {
  if (typeof value !== "string") {
    logger24.throwArgumentError("value must be a string", "value", value);
  }
  if (typeof unitName === "string") {
    const index = names.indexOf(unitName);
    if (index !== -1) {
      unitName = 3 * index;
    }
  }
  return parseFixed(value, unitName != null ? unitName : 18);
}
function formatEther(wei) {
  return formatUnits(wei, 18);
}
function parseEther(ether) {
  return parseUnits(ether, 18);
}
var logger24, names;
var init_lib24 = __esm({
  "../../node_modules/@ethersproject/units/lib.esm/index.js"() {
    "use strict";
    init_lib3();
    init_lib();
    init_version18();
    logger24 = new Logger(version18);
    names = [
      "wei",
      "kwei",
      "mwei",
      "gwei",
      "szabo",
      "finney",
      "ether"
    ];
  }
});

// ../../node_modules/@ethersproject/abstract-provider/lib.esm/_version.js
var version19;
var init_version19 = __esm({
  "../../node_modules/@ethersproject/abstract-provider/lib.esm/_version.js"() {
    "use strict";
    version19 = "abstract-provider/5.8.0";
  }
});

// ../../node_modules/@ethersproject/abstract-provider/lib.esm/index.js
var __awaiter4, logger25, Provider;
var init_lib25 = __esm({
  "../../node_modules/@ethersproject/abstract-provider/lib.esm/index.js"() {
    "use strict";
    init_lib3();
    init_lib4();
    init_lib();
    init_version19();
    __awaiter4 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    logger25 = new Logger(version19);
    Provider = class _Provider {
      constructor() {
        logger25.checkAbstract(new.target, _Provider);
        defineReadOnly(this, "_isProvider", true);
      }
      getFeeData() {
        return __awaiter4(this, void 0, void 0, function* () {
          const { block, gasPrice } = yield resolveProperties({
            block: this.getBlock("latest"),
            gasPrice: this.getGasPrice().catch((error) => {
              return null;
            })
          });
          let lastBaseFeePerGas = null, maxFeePerGas = null, maxPriorityFeePerGas = null;
          if (block && block.baseFeePerGas) {
            lastBaseFeePerGas = block.baseFeePerGas;
            maxPriorityFeePerGas = BigNumber.from("1500000000");
            maxFeePerGas = block.baseFeePerGas.mul(2).add(maxPriorityFeePerGas);
          }
          return { lastBaseFeePerGas, maxFeePerGas, maxPriorityFeePerGas, gasPrice };
        });
      }
      // Alias for "on"
      addListener(eventName, listener) {
        return this.on(eventName, listener);
      }
      // Alias for "off"
      removeListener(eventName, listener) {
        return this.off(eventName, listener);
      }
      static isProvider(value) {
        return !!(value && value._isProvider);
      }
    };
  }
});

// ../../node_modules/@ethersproject/abstract-signer/lib.esm/_version.js
var version20;
var init_version20 = __esm({
  "../../node_modules/@ethersproject/abstract-signer/lib.esm/_version.js"() {
    "use strict";
    version20 = "abstract-signer/5.8.0";
  }
});

// ../../node_modules/@ethersproject/abstract-signer/lib.esm/index.js
var __awaiter5, logger26, allowedTransactionKeys2, forwardErrors, Signer;
var init_lib26 = __esm({
  "../../node_modules/@ethersproject/abstract-signer/lib.esm/index.js"() {
    "use strict";
    init_lib4();
    init_lib();
    init_version20();
    __awaiter5 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    logger26 = new Logger(version20);
    allowedTransactionKeys2 = [
      "accessList",
      "ccipReadEnabled",
      "chainId",
      "customData",
      "data",
      "from",
      "gasLimit",
      "gasPrice",
      "maxFeePerGas",
      "maxPriorityFeePerGas",
      "nonce",
      "to",
      "type",
      "value"
    ];
    forwardErrors = [
      Logger.errors.INSUFFICIENT_FUNDS,
      Logger.errors.NONCE_EXPIRED,
      Logger.errors.REPLACEMENT_UNDERPRICED
    ];
    Signer = class _Signer {
      ///////////////////
      // Sub-classes MUST call super
      constructor() {
        logger26.checkAbstract(new.target, _Signer);
        defineReadOnly(this, "_isSigner", true);
      }
      ///////////////////
      // Sub-classes MAY override these
      getBalance(blockTag) {
        return __awaiter5(this, void 0, void 0, function* () {
          this._checkProvider("getBalance");
          return yield this.provider.getBalance(this.getAddress(), blockTag);
        });
      }
      getTransactionCount(blockTag) {
        return __awaiter5(this, void 0, void 0, function* () {
          this._checkProvider("getTransactionCount");
          return yield this.provider.getTransactionCount(this.getAddress(), blockTag);
        });
      }
      // Populates "from" if unspecified, and estimates the gas for the transaction
      estimateGas(transaction) {
        return __awaiter5(this, void 0, void 0, function* () {
          this._checkProvider("estimateGas");
          const tx = yield resolveProperties(this.checkTransaction(transaction));
          return yield this.provider.estimateGas(tx);
        });
      }
      // Populates "from" if unspecified, and calls with the transaction
      call(transaction, blockTag) {
        return __awaiter5(this, void 0, void 0, function* () {
          this._checkProvider("call");
          const tx = yield resolveProperties(this.checkTransaction(transaction));
          return yield this.provider.call(tx, blockTag);
        });
      }
      // Populates all fields in a transaction, signs it and sends it to the network
      sendTransaction(transaction) {
        return __awaiter5(this, void 0, void 0, function* () {
          this._checkProvider("sendTransaction");
          const tx = yield this.populateTransaction(transaction);
          const signedTx = yield this.signTransaction(tx);
          return yield this.provider.sendTransaction(signedTx);
        });
      }
      getChainId() {
        return __awaiter5(this, void 0, void 0, function* () {
          this._checkProvider("getChainId");
          const network = yield this.provider.getNetwork();
          return network.chainId;
        });
      }
      getGasPrice() {
        return __awaiter5(this, void 0, void 0, function* () {
          this._checkProvider("getGasPrice");
          return yield this.provider.getGasPrice();
        });
      }
      getFeeData() {
        return __awaiter5(this, void 0, void 0, function* () {
          this._checkProvider("getFeeData");
          return yield this.provider.getFeeData();
        });
      }
      resolveName(name) {
        return __awaiter5(this, void 0, void 0, function* () {
          this._checkProvider("resolveName");
          return yield this.provider.resolveName(name);
        });
      }
      // Checks a transaction does not contain invalid keys and if
      // no "from" is provided, populates it.
      // - does NOT require a provider
      // - adds "from" is not present
      // - returns a COPY (safe to mutate the result)
      // By default called from: (overriding these prevents it)
      //   - call
      //   - estimateGas
      //   - populateTransaction (and therefor sendTransaction)
      checkTransaction(transaction) {
        for (const key2 in transaction) {
          if (allowedTransactionKeys2.indexOf(key2) === -1) {
            logger26.throwArgumentError("invalid transaction key: " + key2, "transaction", transaction);
          }
        }
        const tx = shallowCopy(transaction);
        if (tx.from == null) {
          tx.from = this.getAddress();
        } else {
          tx.from = Promise.all([
            Promise.resolve(tx.from),
            this.getAddress()
          ]).then((result) => {
            if (result[0].toLowerCase() !== result[1].toLowerCase()) {
              logger26.throwArgumentError("from address mismatch", "transaction", transaction);
            }
            return result[0];
          });
        }
        return tx;
      }
      // Populates ALL keys for a transaction and checks that "from" matches
      // this Signer. Should be used by sendTransaction but NOT by signTransaction.
      // By default called from: (overriding these prevents it)
      //   - sendTransaction
      //
      // Notes:
      //  - We allow gasPrice for EIP-1559 as long as it matches maxFeePerGas
      populateTransaction(transaction) {
        return __awaiter5(this, void 0, void 0, function* () {
          const tx = yield resolveProperties(this.checkTransaction(transaction));
          if (tx.to != null) {
            tx.to = Promise.resolve(tx.to).then((to) => __awaiter5(this, void 0, void 0, function* () {
              if (to == null) {
                return null;
              }
              const address = yield this.resolveName(to);
              if (address == null) {
                logger26.throwArgumentError("provided ENS name resolves to null", "tx.to", to);
              }
              return address;
            }));
            tx.to.catch((error) => {
            });
          }
          const hasEip1559 = tx.maxFeePerGas != null || tx.maxPriorityFeePerGas != null;
          if (tx.gasPrice != null && (tx.type === 2 || hasEip1559)) {
            logger26.throwArgumentError("eip-1559 transaction do not support gasPrice", "transaction", transaction);
          } else if ((tx.type === 0 || tx.type === 1) && hasEip1559) {
            logger26.throwArgumentError("pre-eip-1559 transaction do not support maxFeePerGas/maxPriorityFeePerGas", "transaction", transaction);
          }
          if ((tx.type === 2 || tx.type == null) && (tx.maxFeePerGas != null && tx.maxPriorityFeePerGas != null)) {
            tx.type = 2;
          } else if (tx.type === 0 || tx.type === 1) {
            if (tx.gasPrice == null) {
              tx.gasPrice = this.getGasPrice();
            }
          } else {
            const feeData = yield this.getFeeData();
            if (tx.type == null) {
              if (feeData.maxFeePerGas != null && feeData.maxPriorityFeePerGas != null) {
                tx.type = 2;
                if (tx.gasPrice != null) {
                  const gasPrice = tx.gasPrice;
                  delete tx.gasPrice;
                  tx.maxFeePerGas = gasPrice;
                  tx.maxPriorityFeePerGas = gasPrice;
                } else {
                  if (tx.maxFeePerGas == null) {
                    tx.maxFeePerGas = feeData.maxFeePerGas;
                  }
                  if (tx.maxPriorityFeePerGas == null) {
                    tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
                  }
                }
              } else if (feeData.gasPrice != null) {
                if (hasEip1559) {
                  logger26.throwError("network does not support EIP-1559", Logger.errors.UNSUPPORTED_OPERATION, {
                    operation: "populateTransaction"
                  });
                }
                if (tx.gasPrice == null) {
                  tx.gasPrice = feeData.gasPrice;
                }
                tx.type = 0;
              } else {
                logger26.throwError("failed to get consistent fee data", Logger.errors.UNSUPPORTED_OPERATION, {
                  operation: "signer.getFeeData"
                });
              }
            } else if (tx.type === 2) {
              if (tx.maxFeePerGas == null) {
                tx.maxFeePerGas = feeData.maxFeePerGas;
              }
              if (tx.maxPriorityFeePerGas == null) {
                tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
              }
            }
          }
          if (tx.nonce == null) {
            tx.nonce = this.getTransactionCount("pending");
          }
          if (tx.gasLimit == null) {
            tx.gasLimit = this.estimateGas(tx).catch((error) => {
              if (forwardErrors.indexOf(error.code) >= 0) {
                throw error;
              }
              return logger26.throwError("cannot estimate gas; transaction may fail or may require manual gas limit", Logger.errors.UNPREDICTABLE_GAS_LIMIT, {
                error,
                tx
              });
            });
          }
          if (tx.chainId == null) {
            tx.chainId = this.getChainId();
          } else {
            tx.chainId = Promise.all([
              Promise.resolve(tx.chainId),
              this.getChainId()
            ]).then((results) => {
              if (results[1] !== 0 && results[0] !== results[1]) {
                logger26.throwArgumentError("chainId address mismatch", "transaction", transaction);
              }
              return results[0];
            });
          }
          return yield resolveProperties(tx);
        });
      }
      ///////////////////
      // Sub-classes SHOULD leave these alone
      _checkProvider(operation) {
        if (!this.provider) {
          logger26.throwError("missing provider", Logger.errors.UNSUPPORTED_OPERATION, {
            operation: operation || "_checkProvider"
          });
        }
      }
      static isSigner(value) {
        return !!(value && value._isSigner);
      }
    };
  }
});

// ../../node_modules/@ethersproject/wallet/lib.esm/_version.js
var version21;
var init_version21 = __esm({
  "../../node_modules/@ethersproject/wallet/lib.esm/_version.js"() {
    "use strict";
    version21 = "wallet/5.8.0";
  }
});

// ../../node_modules/@ethersproject/wallet/lib.esm/index.js
var lib_exports20 = {};
__export(lib_exports20, {
  Wallet: () => Wallet,
  verifyMessage: () => verifyMessage,
  verifyTypedData: () => verifyTypedData
});
function isAccount(value) {
  return value != null && isHexString(value.privateKey, 32) && value.address != null;
}
function hasMnemonic2(value) {
  const mnemonic = value.mnemonic;
  return mnemonic && mnemonic.phrase;
}
function verifyMessage(message, signature2) {
  return recoverAddress(hashMessage(message), signature2);
}
function verifyTypedData(domain, types, value, signature2) {
  return recoverAddress(TypedDataEncoder.hash(domain, types, value), signature2);
}
var __awaiter6, logger27, Wallet;
var init_lib27 = __esm({
  "../../node_modules/@ethersproject/wallet/lib.esm/index.js"() {
    "use strict";
    init_lib7();
    init_lib25();
    init_lib26();
    init_lib2();
    init_lib12();
    init_lib20();
    init_lib5();
    init_lib4();
    init_lib21();
    init_lib17();
    init_lib22();
    init_lib18();
    init_lib();
    init_version21();
    __awaiter6 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    logger27 = new Logger(version21);
    Wallet = class _Wallet extends Signer {
      constructor(privateKey, provider) {
        super();
        if (isAccount(privateKey)) {
          const signingKey = new SigningKey(privateKey.privateKey);
          defineReadOnly(this, "_signingKey", () => signingKey);
          defineReadOnly(this, "address", computeAddress(this.publicKey));
          if (this.address !== getAddress(privateKey.address)) {
            logger27.throwArgumentError("privateKey/address mismatch", "privateKey", "[REDACTED]");
          }
          if (hasMnemonic2(privateKey)) {
            const srcMnemonic = privateKey.mnemonic;
            defineReadOnly(this, "_mnemonic", () => ({
              phrase: srcMnemonic.phrase,
              path: srcMnemonic.path || defaultPath,
              locale: srcMnemonic.locale || "en"
            }));
            const mnemonic = this.mnemonic;
            const node = HDNode.fromMnemonic(mnemonic.phrase, null, mnemonic.locale).derivePath(mnemonic.path);
            if (computeAddress(node.privateKey) !== this.address) {
              logger27.throwArgumentError("mnemonic/address mismatch", "privateKey", "[REDACTED]");
            }
          } else {
            defineReadOnly(this, "_mnemonic", () => null);
          }
        } else {
          if (SigningKey.isSigningKey(privateKey)) {
            if (privateKey.curve !== "secp256k1") {
              logger27.throwArgumentError("unsupported curve; must be secp256k1", "privateKey", "[REDACTED]");
            }
            defineReadOnly(this, "_signingKey", () => privateKey);
          } else {
            if (typeof privateKey === "string") {
              if (privateKey.match(/^[0-9a-f]*$/i) && privateKey.length === 64) {
                privateKey = "0x" + privateKey;
              }
            }
            const signingKey = new SigningKey(privateKey);
            defineReadOnly(this, "_signingKey", () => signingKey);
          }
          defineReadOnly(this, "_mnemonic", () => null);
          defineReadOnly(this, "address", computeAddress(this.publicKey));
        }
        if (provider && !Provider.isProvider(provider)) {
          logger27.throwArgumentError("invalid provider", "provider", provider);
        }
        defineReadOnly(this, "provider", provider || null);
      }
      get mnemonic() {
        return this._mnemonic();
      }
      get privateKey() {
        return this._signingKey().privateKey;
      }
      get publicKey() {
        return this._signingKey().publicKey;
      }
      getAddress() {
        return Promise.resolve(this.address);
      }
      connect(provider) {
        return new _Wallet(this, provider);
      }
      signTransaction(transaction) {
        return resolveProperties(transaction).then((tx) => {
          if (tx.from != null) {
            if (getAddress(tx.from) !== this.address) {
              logger27.throwArgumentError("transaction from address mismatch", "transaction.from", transaction.from);
            }
            delete tx.from;
          }
          const signature2 = this._signingKey().signDigest(keccak256(serialize(tx)));
          return serialize(tx, signature2);
        });
      }
      signMessage(message) {
        return __awaiter6(this, void 0, void 0, function* () {
          return joinSignature(this._signingKey().signDigest(hashMessage(message)));
        });
      }
      _signTypedData(domain, types, value) {
        return __awaiter6(this, void 0, void 0, function* () {
          const populated = yield TypedDataEncoder.resolveNames(domain, types, value, (name) => {
            if (this.provider == null) {
              logger27.throwError("cannot resolve ENS names without a provider", Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "resolveName",
                value: name
              });
            }
            return this.provider.resolveName(name);
          });
          return joinSignature(this._signingKey().signDigest(TypedDataEncoder.hash(populated.domain, types, populated.value)));
        });
      }
      encrypt(password, options, progressCallback) {
        if (typeof options === "function" && !progressCallback) {
          progressCallback = options;
          options = {};
        }
        if (progressCallback && typeof progressCallback !== "function") {
          throw new Error("invalid callback");
        }
        if (!options) {
          options = {};
        }
        return encrypt(this, password, options, progressCallback);
      }
      /**
       *  Static methods to create Wallet instances.
       */
      static createRandom(options) {
        let entropy = randomBytes(16);
        if (!options) {
          options = {};
        }
        if (options.extraEntropy) {
          entropy = arrayify(hexDataSlice(keccak256(concat([entropy, options.extraEntropy])), 0, 16));
        }
        const mnemonic = entropyToMnemonic(entropy, options.locale);
        return _Wallet.fromMnemonic(mnemonic, options.path, options.locale);
      }
      static fromEncryptedJson(json, password, progressCallback) {
        return decryptJsonWallet(json, password, progressCallback).then((account) => {
          return new _Wallet(account);
        });
      }
      static fromEncryptedJsonSync(json, password) {
        return new _Wallet(decryptJsonWalletSync(json, password));
      }
      static fromMnemonic(mnemonic, path, wordlist2) {
        if (!path) {
          path = defaultPath;
        }
        return new _Wallet(HDNode.fromMnemonic(mnemonic, null, wordlist2).derivePath(path));
      }
    };
  }
});

// ../../node_modules/@ethersproject/web/lib.esm/_version.js
var version22;
var init_version22 = __esm({
  "../../node_modules/@ethersproject/web/lib.esm/_version.js"() {
    "use strict";
    version22 = "web/5.8.0";
  }
});

// ../../node_modules/@ethersproject/web/lib.esm/geturl.js
function getUrl(href, options) {
  return __awaiter7(this, void 0, void 0, function* () {
    if (options == null) {
      options = {};
    }
    const request = {
      method: options.method || "GET",
      headers: options.headers || {},
      body: options.body || void 0
    };
    if (options.skipFetchSetup !== true) {
      request.mode = "cors";
      request.cache = "no-cache";
      request.credentials = "same-origin";
      request.redirect = "follow";
      request.referrer = "client";
    }
    ;
    if (options.fetchOptions != null) {
      const opts = options.fetchOptions;
      if (opts.mode) {
        request.mode = opts.mode;
      }
      if (opts.cache) {
        request.cache = opts.cache;
      }
      if (opts.credentials) {
        request.credentials = opts.credentials;
      }
      if (opts.redirect) {
        request.redirect = opts.redirect;
      }
      if (opts.referrer) {
        request.referrer = opts.referrer;
      }
    }
    const response = yield fetch(href, request);
    const body = yield response.arrayBuffer();
    const headers = {};
    if (response.headers.forEach) {
      response.headers.forEach((value, key2) => {
        headers[key2.toLowerCase()] = value;
      });
    } else {
      response.headers.keys().forEach((key2) => {
        headers[key2.toLowerCase()] = response.headers.get(key2);
      });
    }
    return {
      headers,
      statusCode: response.status,
      statusMessage: response.statusText,
      body: arrayify(new Uint8Array(body))
    };
  });
}
var __awaiter7;
var init_geturl = __esm({
  "../../node_modules/@ethersproject/web/lib.esm/geturl.js"() {
    "use strict";
    init_lib2();
    __awaiter7 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
  }
});

// ../../node_modules/@ethersproject/web/lib.esm/index.js
var lib_exports21 = {};
__export(lib_exports21, {
  _fetchData: () => _fetchData,
  fetchJson: () => fetchJson,
  poll: () => poll
});
function staller(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}
function bodyify(value, type) {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (isBytesLike(value)) {
    if (type && (type.split("/")[0] === "text" || type.split(";")[0].trim() === "application/json")) {
      try {
        return toUtf8String(value);
      } catch (error) {
      }
      ;
    }
    return hexlify(value);
  }
  return value;
}
function unpercent(value) {
  return toUtf8Bytes(value.replace(/%([0-9a-f][0-9a-f])/gi, (all, code) => {
    return String.fromCharCode(parseInt(code, 16));
  }));
}
function _fetchData(connection, body, processFunc) {
  const attemptLimit = typeof connection === "object" && connection.throttleLimit != null ? connection.throttleLimit : 12;
  logger28.assertArgument(attemptLimit > 0 && attemptLimit % 1 === 0, "invalid connection throttle limit", "connection.throttleLimit", attemptLimit);
  const throttleCallback = typeof connection === "object" ? connection.throttleCallback : null;
  const throttleSlotInterval = typeof connection === "object" && typeof connection.throttleSlotInterval === "number" ? connection.throttleSlotInterval : 100;
  logger28.assertArgument(throttleSlotInterval > 0 && throttleSlotInterval % 1 === 0, "invalid connection throttle slot interval", "connection.throttleSlotInterval", throttleSlotInterval);
  const errorPassThrough = typeof connection === "object" ? !!connection.errorPassThrough : false;
  const headers = {};
  let url = null;
  const options = {
    method: "GET"
  };
  let allow304 = false;
  let timeout = 2 * 60 * 1e3;
  if (typeof connection === "string") {
    url = connection;
  } else if (typeof connection === "object") {
    if (connection == null || connection.url == null) {
      logger28.throwArgumentError("missing URL", "connection.url", connection);
    }
    url = connection.url;
    if (typeof connection.timeout === "number" && connection.timeout > 0) {
      timeout = connection.timeout;
    }
    if (connection.headers) {
      for (const key2 in connection.headers) {
        headers[key2.toLowerCase()] = { key: key2, value: String(connection.headers[key2]) };
        if (["if-none-match", "if-modified-since"].indexOf(key2.toLowerCase()) >= 0) {
          allow304 = true;
        }
      }
    }
    options.allowGzip = !!connection.allowGzip;
    if (connection.user != null && connection.password != null) {
      if (url.substring(0, 6) !== "https:" && connection.allowInsecureAuthentication !== true) {
        logger28.throwError("basic authentication requires a secure https url", Logger.errors.INVALID_ARGUMENT, { argument: "url", url, user: connection.user, password: "[REDACTED]" });
      }
      const authorization = connection.user + ":" + connection.password;
      headers["authorization"] = {
        key: "Authorization",
        value: "Basic " + encode2(toUtf8Bytes(authorization))
      };
    }
    if (connection.skipFetchSetup != null) {
      options.skipFetchSetup = !!connection.skipFetchSetup;
    }
    if (connection.fetchOptions != null) {
      options.fetchOptions = shallowCopy(connection.fetchOptions);
    }
  }
  const reData = new RegExp("^data:([^;:]*)?(;base64)?,(.*)$", "i");
  const dataMatch = url ? url.match(reData) : null;
  if (dataMatch) {
    try {
      const response = {
        statusCode: 200,
        statusMessage: "OK",
        headers: { "content-type": dataMatch[1] || "text/plain" },
        body: dataMatch[2] ? decode2(dataMatch[3]) : unpercent(dataMatch[3])
      };
      let result = response.body;
      if (processFunc) {
        result = processFunc(response.body, response);
      }
      return Promise.resolve(result);
    } catch (error) {
      logger28.throwError("processing response error", Logger.errors.SERVER_ERROR, {
        body: bodyify(dataMatch[1], dataMatch[2]),
        error,
        requestBody: null,
        requestMethod: "GET",
        url
      });
    }
  }
  if (body) {
    options.method = "POST";
    options.body = body;
    if (headers["content-type"] == null) {
      headers["content-type"] = { key: "Content-Type", value: "application/octet-stream" };
    }
    if (headers["content-length"] == null) {
      headers["content-length"] = { key: "Content-Length", value: String(body.length) };
    }
  }
  const flatHeaders = {};
  Object.keys(headers).forEach((key2) => {
    const header = headers[key2];
    flatHeaders[header.key] = header.value;
  });
  options.headers = flatHeaders;
  const runningTimeout = (function() {
    let timer = null;
    const promise = new Promise(function(resolve, reject) {
      if (timeout) {
        timer = setTimeout(() => {
          if (timer == null) {
            return;
          }
          timer = null;
          reject(logger28.makeError("timeout", Logger.errors.TIMEOUT, {
            requestBody: bodyify(options.body, flatHeaders["content-type"]),
            requestMethod: options.method,
            timeout,
            url
          }));
        }, timeout);
      }
    });
    const cancel = function() {
      if (timer == null) {
        return;
      }
      clearTimeout(timer);
      timer = null;
    };
    return { promise, cancel };
  })();
  const runningFetch = (function() {
    return __awaiter8(this, void 0, void 0, function* () {
      for (let attempt = 0; attempt < attemptLimit; attempt++) {
        let response = null;
        try {
          response = yield getUrl(url, options);
          if (attempt < attemptLimit) {
            if (response.statusCode === 301 || response.statusCode === 302) {
              const location = response.headers.location || "";
              if (options.method === "GET" && location.match(/^https:/)) {
                url = response.headers.location;
                continue;
              }
            } else if (response.statusCode === 429) {
              let tryAgain = true;
              if (throttleCallback) {
                tryAgain = yield throttleCallback(attempt, url);
              }
              if (tryAgain) {
                let stall = 0;
                const retryAfter = response.headers["retry-after"];
                if (typeof retryAfter === "string" && retryAfter.match(/^[1-9][0-9]*$/)) {
                  stall = parseInt(retryAfter) * 1e3;
                } else {
                  stall = throttleSlotInterval * parseInt(String(Math.random() * Math.pow(2, attempt)));
                }
                yield staller(stall);
                continue;
              }
            }
          }
        } catch (error) {
          response = error.response;
          if (response == null) {
            runningTimeout.cancel();
            logger28.throwError("missing response", Logger.errors.SERVER_ERROR, {
              requestBody: bodyify(options.body, flatHeaders["content-type"]),
              requestMethod: options.method,
              serverError: error,
              url
            });
          }
        }
        let body2 = response.body;
        if (allow304 && response.statusCode === 304) {
          body2 = null;
        } else if (!errorPassThrough && (response.statusCode < 200 || response.statusCode >= 300)) {
          runningTimeout.cancel();
          logger28.throwError("bad response", Logger.errors.SERVER_ERROR, {
            status: response.statusCode,
            headers: response.headers,
            body: bodyify(body2, response.headers ? response.headers["content-type"] : null),
            requestBody: bodyify(options.body, flatHeaders["content-type"]),
            requestMethod: options.method,
            url
          });
        }
        if (processFunc) {
          try {
            const result = yield processFunc(body2, response);
            runningTimeout.cancel();
            return result;
          } catch (error) {
            if (error.throttleRetry && attempt < attemptLimit) {
              let tryAgain = true;
              if (throttleCallback) {
                tryAgain = yield throttleCallback(attempt, url);
              }
              if (tryAgain) {
                const timeout2 = throttleSlotInterval * parseInt(String(Math.random() * Math.pow(2, attempt)));
                yield staller(timeout2);
                continue;
              }
            }
            runningTimeout.cancel();
            logger28.throwError("processing response error", Logger.errors.SERVER_ERROR, {
              body: bodyify(body2, response.headers ? response.headers["content-type"] : null),
              error,
              requestBody: bodyify(options.body, flatHeaders["content-type"]),
              requestMethod: options.method,
              url
            });
          }
        }
        runningTimeout.cancel();
        return body2;
      }
      return logger28.throwError("failed response", Logger.errors.SERVER_ERROR, {
        requestBody: bodyify(options.body, flatHeaders["content-type"]),
        requestMethod: options.method,
        url
      });
    });
  })();
  return Promise.race([runningTimeout.promise, runningFetch]);
}
function fetchJson(connection, json, processFunc) {
  let processJsonFunc = (value, response) => {
    let result = null;
    if (value != null) {
      try {
        result = JSON.parse(toUtf8String(value));
      } catch (error) {
        logger28.throwError("invalid JSON", Logger.errors.SERVER_ERROR, {
          body: value,
          error
        });
      }
    }
    if (processFunc) {
      result = processFunc(result, response);
    }
    return result;
  };
  let body = null;
  if (json != null) {
    body = toUtf8Bytes(json);
    const updated = typeof connection === "string" ? { url: connection } : shallowCopy(connection);
    if (updated.headers) {
      const hasContentType = Object.keys(updated.headers).filter((k) => k.toLowerCase() === "content-type").length !== 0;
      if (!hasContentType) {
        updated.headers = shallowCopy(updated.headers);
        updated.headers["content-type"] = "application/json";
      }
    } else {
      updated.headers = { "content-type": "application/json" };
    }
    connection = updated;
  }
  return _fetchData(connection, body, processJsonFunc);
}
function poll(func, options) {
  if (!options) {
    options = {};
  }
  options = shallowCopy(options);
  if (options.floor == null) {
    options.floor = 0;
  }
  if (options.ceiling == null) {
    options.ceiling = 1e4;
  }
  if (options.interval == null) {
    options.interval = 250;
  }
  return new Promise(function(resolve, reject) {
    let timer = null;
    let done = false;
    const cancel = () => {
      if (done) {
        return false;
      }
      done = true;
      if (timer) {
        clearTimeout(timer);
      }
      return true;
    };
    if (options.timeout) {
      timer = setTimeout(() => {
        if (cancel()) {
          reject(new Error("timeout"));
        }
      }, options.timeout);
    }
    const retryLimit = options.retryLimit;
    let attempt = 0;
    function check() {
      return func().then(function(result) {
        if (result !== void 0) {
          if (cancel()) {
            resolve(result);
          }
        } else if (options.oncePoll) {
          options.oncePoll.once("poll", check);
        } else if (options.onceBlock) {
          options.onceBlock.once("block", check);
        } else if (!done) {
          attempt++;
          if (attempt > retryLimit) {
            if (cancel()) {
              reject(new Error("retry limit reached"));
            }
            return;
          }
          let timeout = options.interval * parseInt(String(Math.random() * Math.pow(2, attempt)));
          if (timeout < options.floor) {
            timeout = options.floor;
          }
          if (timeout > options.ceiling) {
            timeout = options.ceiling;
          }
          setTimeout(check, timeout);
        }
        return null;
      }, function(error) {
        if (cancel()) {
          reject(error);
        }
      });
    }
    check();
  });
}
var __awaiter8, logger28;
var init_lib28 = __esm({
  "../../node_modules/@ethersproject/web/lib.esm/index.js"() {
    "use strict";
    init_lib10();
    init_lib2();
    init_lib4();
    init_lib9();
    init_lib();
    init_version22();
    init_geturl();
    __awaiter8 = function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    logger28 = new Logger(version22);
  }
});

// ../../node_modules/ethers/lib/utils.js
var require_utils2 = __commonJS({
  "../../node_modules/ethers/lib/utils.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      Object.defineProperty(o, k2, { enumerable: true, get: function() {
        return m[k];
      } });
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.formatBytes32String = exports.Utf8ErrorFuncs = exports.toUtf8String = exports.toUtf8CodePoints = exports.toUtf8Bytes = exports._toEscapedUtf8String = exports.nameprep = exports.hexDataSlice = exports.hexDataLength = exports.hexZeroPad = exports.hexValue = exports.hexStripZeros = exports.hexConcat = exports.isHexString = exports.hexlify = exports.base64 = exports.base58 = exports.TransactionDescription = exports.LogDescription = exports.Interface = exports.SigningKey = exports.HDNode = exports.defaultPath = exports.isBytesLike = exports.isBytes = exports.zeroPad = exports.stripZeros = exports.concat = exports.arrayify = exports.shallowCopy = exports.resolveProperties = exports.getStatic = exports.defineReadOnly = exports.deepCopy = exports.checkProperties = exports.poll = exports.fetchJson = exports._fetchData = exports.RLP = exports.Logger = exports.checkResultErrors = exports.FormatTypes = exports.ParamType = exports.FunctionFragment = exports.EventFragment = exports.ErrorFragment = exports.ConstructorFragment = exports.Fragment = exports.defaultAbiCoder = exports.AbiCoder = void 0;
    exports.Indexed = exports.Utf8ErrorReason = exports.UnicodeNormalizationForm = exports.SupportedAlgorithm = exports.mnemonicToSeed = exports.isValidMnemonic = exports.entropyToMnemonic = exports.mnemonicToEntropy = exports.getAccountPath = exports.verifyTypedData = exports.verifyMessage = exports.recoverPublicKey = exports.computePublicKey = exports.recoverAddress = exports.computeAddress = exports.getJsonWalletAddress = exports.TransactionTypes = exports.serializeTransaction = exports.parseTransaction = exports.accessListify = exports.joinSignature = exports.splitSignature = exports.soliditySha256 = exports.solidityKeccak256 = exports.solidityPack = exports.shuffled = exports.randomBytes = exports.sha512 = exports.sha256 = exports.ripemd160 = exports.keccak256 = exports.computeHmac = exports.commify = exports.parseUnits = exports.formatUnits = exports.parseEther = exports.formatEther = exports.isAddress = exports.getCreate2Address = exports.getContractAddress = exports.getIcapAddress = exports.getAddress = exports._TypedDataEncoder = exports.id = exports.isValidName = exports.namehash = exports.hashMessage = exports.dnsEncode = exports.parseBytes32String = void 0;
    var abi_1 = (init_lib13(), __toCommonJS(lib_exports10));
    Object.defineProperty(exports, "AbiCoder", { enumerable: true, get: function() {
      return abi_1.AbiCoder;
    } });
    Object.defineProperty(exports, "checkResultErrors", { enumerable: true, get: function() {
      return abi_1.checkResultErrors;
    } });
    Object.defineProperty(exports, "ConstructorFragment", { enumerable: true, get: function() {
      return abi_1.ConstructorFragment;
    } });
    Object.defineProperty(exports, "defaultAbiCoder", { enumerable: true, get: function() {
      return abi_1.defaultAbiCoder;
    } });
    Object.defineProperty(exports, "ErrorFragment", { enumerable: true, get: function() {
      return abi_1.ErrorFragment;
    } });
    Object.defineProperty(exports, "EventFragment", { enumerable: true, get: function() {
      return abi_1.EventFragment;
    } });
    Object.defineProperty(exports, "FormatTypes", { enumerable: true, get: function() {
      return abi_1.FormatTypes;
    } });
    Object.defineProperty(exports, "Fragment", { enumerable: true, get: function() {
      return abi_1.Fragment;
    } });
    Object.defineProperty(exports, "FunctionFragment", { enumerable: true, get: function() {
      return abi_1.FunctionFragment;
    } });
    Object.defineProperty(exports, "Indexed", { enumerable: true, get: function() {
      return abi_1.Indexed;
    } });
    Object.defineProperty(exports, "Interface", { enumerable: true, get: function() {
      return abi_1.Interface;
    } });
    Object.defineProperty(exports, "LogDescription", { enumerable: true, get: function() {
      return abi_1.LogDescription;
    } });
    Object.defineProperty(exports, "ParamType", { enumerable: true, get: function() {
      return abi_1.ParamType;
    } });
    Object.defineProperty(exports, "TransactionDescription", { enumerable: true, get: function() {
      return abi_1.TransactionDescription;
    } });
    var address_1 = (init_lib7(), __toCommonJS(lib_exports6));
    Object.defineProperty(exports, "getAddress", { enumerable: true, get: function() {
      return address_1.getAddress;
    } });
    Object.defineProperty(exports, "getCreate2Address", { enumerable: true, get: function() {
      return address_1.getCreate2Address;
    } });
    Object.defineProperty(exports, "getContractAddress", { enumerable: true, get: function() {
      return address_1.getContractAddress;
    } });
    Object.defineProperty(exports, "getIcapAddress", { enumerable: true, get: function() {
      return address_1.getIcapAddress;
    } });
    Object.defineProperty(exports, "isAddress", { enumerable: true, get: function() {
      return address_1.isAddress;
    } });
    var base64 = __importStar((init_lib10(), __toCommonJS(lib_exports8)));
    exports.base64 = base64;
    var basex_1 = (init_lib14(), __toCommonJS(lib_exports11));
    Object.defineProperty(exports, "base58", { enumerable: true, get: function() {
      return basex_1.Base58;
    } });
    var bytes_1 = (init_lib2(), __toCommonJS(lib_exports2));
    Object.defineProperty(exports, "arrayify", { enumerable: true, get: function() {
      return bytes_1.arrayify;
    } });
    Object.defineProperty(exports, "concat", { enumerable: true, get: function() {
      return bytes_1.concat;
    } });
    Object.defineProperty(exports, "hexConcat", { enumerable: true, get: function() {
      return bytes_1.hexConcat;
    } });
    Object.defineProperty(exports, "hexDataSlice", { enumerable: true, get: function() {
      return bytes_1.hexDataSlice;
    } });
    Object.defineProperty(exports, "hexDataLength", { enumerable: true, get: function() {
      return bytes_1.hexDataLength;
    } });
    Object.defineProperty(exports, "hexlify", { enumerable: true, get: function() {
      return bytes_1.hexlify;
    } });
    Object.defineProperty(exports, "hexStripZeros", { enumerable: true, get: function() {
      return bytes_1.hexStripZeros;
    } });
    Object.defineProperty(exports, "hexValue", { enumerable: true, get: function() {
      return bytes_1.hexValue;
    } });
    Object.defineProperty(exports, "hexZeroPad", { enumerable: true, get: function() {
      return bytes_1.hexZeroPad;
    } });
    Object.defineProperty(exports, "isBytes", { enumerable: true, get: function() {
      return bytes_1.isBytes;
    } });
    Object.defineProperty(exports, "isBytesLike", { enumerable: true, get: function() {
      return bytes_1.isBytesLike;
    } });
    Object.defineProperty(exports, "isHexString", { enumerable: true, get: function() {
      return bytes_1.isHexString;
    } });
    Object.defineProperty(exports, "joinSignature", { enumerable: true, get: function() {
      return bytes_1.joinSignature;
    } });
    Object.defineProperty(exports, "zeroPad", { enumerable: true, get: function() {
      return bytes_1.zeroPad;
    } });
    Object.defineProperty(exports, "splitSignature", { enumerable: true, get: function() {
      return bytes_1.splitSignature;
    } });
    Object.defineProperty(exports, "stripZeros", { enumerable: true, get: function() {
      return bytes_1.stripZeros;
    } });
    var hash_1 = (init_lib12(), __toCommonJS(lib_exports9));
    Object.defineProperty(exports, "_TypedDataEncoder", { enumerable: true, get: function() {
      return hash_1._TypedDataEncoder;
    } });
    Object.defineProperty(exports, "dnsEncode", { enumerable: true, get: function() {
      return hash_1.dnsEncode;
    } });
    Object.defineProperty(exports, "hashMessage", { enumerable: true, get: function() {
      return hash_1.hashMessage;
    } });
    Object.defineProperty(exports, "id", { enumerable: true, get: function() {
      return hash_1.id;
    } });
    Object.defineProperty(exports, "isValidName", { enumerable: true, get: function() {
      return hash_1.isValidName;
    } });
    Object.defineProperty(exports, "namehash", { enumerable: true, get: function() {
      return hash_1.namehash;
    } });
    var hdnode_1 = (init_lib20(), __toCommonJS(lib_exports15));
    Object.defineProperty(exports, "defaultPath", { enumerable: true, get: function() {
      return hdnode_1.defaultPath;
    } });
    Object.defineProperty(exports, "entropyToMnemonic", { enumerable: true, get: function() {
      return hdnode_1.entropyToMnemonic;
    } });
    Object.defineProperty(exports, "getAccountPath", { enumerable: true, get: function() {
      return hdnode_1.getAccountPath;
    } });
    Object.defineProperty(exports, "HDNode", { enumerable: true, get: function() {
      return hdnode_1.HDNode;
    } });
    Object.defineProperty(exports, "isValidMnemonic", { enumerable: true, get: function() {
      return hdnode_1.isValidMnemonic;
    } });
    Object.defineProperty(exports, "mnemonicToEntropy", { enumerable: true, get: function() {
      return hdnode_1.mnemonicToEntropy;
    } });
    Object.defineProperty(exports, "mnemonicToSeed", { enumerable: true, get: function() {
      return hdnode_1.mnemonicToSeed;
    } });
    var json_wallets_1 = (init_lib22(), __toCommonJS(lib_exports17));
    Object.defineProperty(exports, "getJsonWalletAddress", { enumerable: true, get: function() {
      return json_wallets_1.getJsonWalletAddress;
    } });
    var keccak256_1 = (init_lib5(), __toCommonJS(lib_exports4));
    Object.defineProperty(exports, "keccak256", { enumerable: true, get: function() {
      return keccak256_1.keccak256;
    } });
    var logger_1 = (init_lib(), __toCommonJS(lib_exports));
    Object.defineProperty(exports, "Logger", { enumerable: true, get: function() {
      return logger_1.Logger;
    } });
    var sha2_1 = (init_lib15(), __toCommonJS(lib_exports12));
    Object.defineProperty(exports, "computeHmac", { enumerable: true, get: function() {
      return sha2_1.computeHmac;
    } });
    Object.defineProperty(exports, "ripemd160", { enumerable: true, get: function() {
      return sha2_1.ripemd160;
    } });
    Object.defineProperty(exports, "sha256", { enumerable: true, get: function() {
      return sha2_1.sha256;
    } });
    Object.defineProperty(exports, "sha512", { enumerable: true, get: function() {
      return sha2_1.sha512;
    } });
    var solidity_1 = (init_lib23(), __toCommonJS(lib_exports18));
    Object.defineProperty(exports, "solidityKeccak256", { enumerable: true, get: function() {
      return solidity_1.keccak256;
    } });
    Object.defineProperty(exports, "solidityPack", { enumerable: true, get: function() {
      return solidity_1.pack;
    } });
    Object.defineProperty(exports, "soliditySha256", { enumerable: true, get: function() {
      return solidity_1.sha256;
    } });
    var random_1 = (init_lib21(), __toCommonJS(lib_exports16));
    Object.defineProperty(exports, "randomBytes", { enumerable: true, get: function() {
      return random_1.randomBytes;
    } });
    Object.defineProperty(exports, "shuffled", { enumerable: true, get: function() {
      return random_1.shuffled;
    } });
    var properties_1 = (init_lib4(), __toCommonJS(lib_exports3));
    Object.defineProperty(exports, "checkProperties", { enumerable: true, get: function() {
      return properties_1.checkProperties;
    } });
    Object.defineProperty(exports, "deepCopy", { enumerable: true, get: function() {
      return properties_1.deepCopy;
    } });
    Object.defineProperty(exports, "defineReadOnly", { enumerable: true, get: function() {
      return properties_1.defineReadOnly;
    } });
    Object.defineProperty(exports, "getStatic", { enumerable: true, get: function() {
      return properties_1.getStatic;
    } });
    Object.defineProperty(exports, "resolveProperties", { enumerable: true, get: function() {
      return properties_1.resolveProperties;
    } });
    Object.defineProperty(exports, "shallowCopy", { enumerable: true, get: function() {
      return properties_1.shallowCopy;
    } });
    var RLP = __importStar((init_lib6(), __toCommonJS(lib_exports5)));
    exports.RLP = RLP;
    var signing_key_1 = (init_lib17(), __toCommonJS(lib_exports13));
    Object.defineProperty(exports, "computePublicKey", { enumerable: true, get: function() {
      return signing_key_1.computePublicKey;
    } });
    Object.defineProperty(exports, "recoverPublicKey", { enumerable: true, get: function() {
      return signing_key_1.recoverPublicKey;
    } });
    Object.defineProperty(exports, "SigningKey", { enumerable: true, get: function() {
      return signing_key_1.SigningKey;
    } });
    var strings_1 = (init_lib9(), __toCommonJS(lib_exports7));
    Object.defineProperty(exports, "formatBytes32String", { enumerable: true, get: function() {
      return strings_1.formatBytes32String;
    } });
    Object.defineProperty(exports, "nameprep", { enumerable: true, get: function() {
      return strings_1.nameprep;
    } });
    Object.defineProperty(exports, "parseBytes32String", { enumerable: true, get: function() {
      return strings_1.parseBytes32String;
    } });
    Object.defineProperty(exports, "_toEscapedUtf8String", { enumerable: true, get: function() {
      return strings_1._toEscapedUtf8String;
    } });
    Object.defineProperty(exports, "toUtf8Bytes", { enumerable: true, get: function() {
      return strings_1.toUtf8Bytes;
    } });
    Object.defineProperty(exports, "toUtf8CodePoints", { enumerable: true, get: function() {
      return strings_1.toUtf8CodePoints;
    } });
    Object.defineProperty(exports, "toUtf8String", { enumerable: true, get: function() {
      return strings_1.toUtf8String;
    } });
    Object.defineProperty(exports, "Utf8ErrorFuncs", { enumerable: true, get: function() {
      return strings_1.Utf8ErrorFuncs;
    } });
    var transactions_1 = (init_lib18(), __toCommonJS(lib_exports14));
    Object.defineProperty(exports, "accessListify", { enumerable: true, get: function() {
      return transactions_1.accessListify;
    } });
    Object.defineProperty(exports, "computeAddress", { enumerable: true, get: function() {
      return transactions_1.computeAddress;
    } });
    Object.defineProperty(exports, "parseTransaction", { enumerable: true, get: function() {
      return transactions_1.parse;
    } });
    Object.defineProperty(exports, "recoverAddress", { enumerable: true, get: function() {
      return transactions_1.recoverAddress;
    } });
    Object.defineProperty(exports, "serializeTransaction", { enumerable: true, get: function() {
      return transactions_1.serialize;
    } });
    Object.defineProperty(exports, "TransactionTypes", { enumerable: true, get: function() {
      return transactions_1.TransactionTypes;
    } });
    var units_1 = (init_lib24(), __toCommonJS(lib_exports19));
    Object.defineProperty(exports, "commify", { enumerable: true, get: function() {
      return units_1.commify;
    } });
    Object.defineProperty(exports, "formatEther", { enumerable: true, get: function() {
      return units_1.formatEther;
    } });
    Object.defineProperty(exports, "parseEther", { enumerable: true, get: function() {
      return units_1.parseEther;
    } });
    Object.defineProperty(exports, "formatUnits", { enumerable: true, get: function() {
      return units_1.formatUnits;
    } });
    Object.defineProperty(exports, "parseUnits", { enumerable: true, get: function() {
      return units_1.parseUnits;
    } });
    var wallet_1 = (init_lib27(), __toCommonJS(lib_exports20));
    Object.defineProperty(exports, "verifyMessage", { enumerable: true, get: function() {
      return wallet_1.verifyMessage;
    } });
    Object.defineProperty(exports, "verifyTypedData", { enumerable: true, get: function() {
      return wallet_1.verifyTypedData;
    } });
    var web_1 = (init_lib28(), __toCommonJS(lib_exports21));
    Object.defineProperty(exports, "_fetchData", { enumerable: true, get: function() {
      return web_1._fetchData;
    } });
    Object.defineProperty(exports, "fetchJson", { enumerable: true, get: function() {
      return web_1.fetchJson;
    } });
    Object.defineProperty(exports, "poll", { enumerable: true, get: function() {
      return web_1.poll;
    } });
    var sha2_2 = (init_lib15(), __toCommonJS(lib_exports12));
    Object.defineProperty(exports, "SupportedAlgorithm", { enumerable: true, get: function() {
      return sha2_2.SupportedAlgorithm;
    } });
    var strings_2 = (init_lib9(), __toCommonJS(lib_exports7));
    Object.defineProperty(exports, "UnicodeNormalizationForm", { enumerable: true, get: function() {
      return strings_2.UnicodeNormalizationForm;
    } });
    Object.defineProperty(exports, "Utf8ErrorReason", { enumerable: true, get: function() {
      return strings_2.Utf8ErrorReason;
    } });
  }
});

// src/NodeWasmBindings.ts
import {
  invoke,
  invokeAny,
  computeCid,
  prepareSession,
  completeSessionSetup,
  ensureEip55,
  makeSpaceId,
  createDelegation,
  parseRecapFromSiwe,
  generateHostSIWEMessage,
  siweToDelegationHeaders,
  protocolVersion,
  TCWSessionManager,
  initPanicHook,
  vault_encrypt,
  vault_decrypt,
  vault_derive_key,
  vault_x25519_from_seed,
  vault_x25519_dh,
  vault_random_bytes,
  vault_sha256
} from "@tinycloud/node-sdk-wasm";
var _NodeWasmBindings = class _NodeWasmBindings {
  constructor() {
    this.invoke = invoke;
    this.invokeAny = invokeAny;
    this.computeCid = computeCid;
    this.prepareSession = prepareSession;
    this.completeSessionSetup = completeSessionSetup;
    this.ensureEip55 = ensureEip55;
    this.makeSpaceId = makeSpaceId;
    this.createDelegation = createDelegation;
    this.parseRecapFromSiwe = parseRecapFromSiwe;
    this.generateHostSIWEMessage = generateHostSIWEMessage;
    this.siweToDelegationHeaders = siweToDelegationHeaders;
    this.protocolVersion = protocolVersion;
    // Vault crypto
    this.vault_encrypt = vault_encrypt;
    this.vault_decrypt = vault_decrypt;
    this.vault_derive_key = vault_derive_key;
    this.vault_x25519_from_seed = vault_x25519_from_seed;
    this.vault_x25519_dh = vault_x25519_dh;
    this.vault_random_bytes = vault_random_bytes;
    this.vault_sha256 = vault_sha256;
    if (!_NodeWasmBindings.panicHookInitialized) {
      initPanicHook();
      _NodeWasmBindings.panicHookInitialized = true;
    }
  }
  createSessionManager() {
    return new TCWSessionManager();
  }
  // No ensureInitialized needed — Node WASM is synchronous
};
_NodeWasmBindings.panicHookInitialized = false;
var NodeWasmBindings = _NodeWasmBindings;

// src/signers/PrivateKeySigner.ts
import {
  signEthereumMessage,
  ensureEip55 as ensureEip552
} from "@tinycloud/node-sdk-wasm";
var PrivateKeySigner = class {
  /**
   * Create a new PrivateKeySigner.
   *
   * @param privateKey - Hex-encoded private key (with or without 0x prefix)
   * @param chainId - Chain ID for signing (default: 1 for mainnet)
   */
  constructor(privateKey, chainId = 1) {
    this.privateKeyHex = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
    this.chainId = chainId;
    if (this.privateKeyHex.length !== 64) {
      throw new Error("Invalid private key: must be 32 bytes (64 hex chars)");
    }
  }
  /**
   * Get the Ethereum address for this signer.
   */
  async getAddress() {
    if (this.cachedAddress) {
      return this.cachedAddress;
    }
    this.cachedAddress = this.deriveAddress();
    return this.cachedAddress;
  }
  /**
   * Derive Ethereum address from private key.
   * Uses secp256k1 public key derivation via ethers.js.
   */
  deriveAddress() {
    try {
      const { keccak256: keccak2563 } = require_utils2();
      const { SigningKey: SigningKey2 } = require_utils2();
      const signingKey = new SigningKey2("0x" + this.privateKeyHex);
      const publicKey = signingKey.publicKey;
      const pubKeyWithoutPrefix = publicKey.slice(4);
      const hash3 = keccak2563("0x" + pubKeyWithoutPrefix);
      const address = "0x" + hash3.slice(-40);
      return ensureEip552(address);
    } catch {
      return "0x" + this.privateKeyHex.slice(0, 40);
    }
  }
  /**
   * Get the chain ID for this signer.
   */
  async getChainId() {
    return this.chainId;
  }
  /**
   * Sign a message.
   *
   * @param message - The message to sign (string or bytes)
   * @returns The signature as a hex string
   */
  async signMessage(message) {
    const messageStr = typeof message === "string" ? message : Buffer.from(message).toString("utf-8");
    const signature2 = signEthereumMessage(messageStr, this.privateKeyHex);
    return signature2.startsWith("0x") ? signature2 : "0x" + signature2;
  }
};

// src/TinyCloudNode.ts
import {
  TinyCloud,
  activateSessionWithHost as activateSessionWithHost2,
  KVService as KVService2,
  SQLService as SQLService2,
  DuckDbService as DuckDbService2,
  HooksService as HooksService2,
  DataVaultService,
  EncryptionService,
  SecretsService,
  createVaultCrypto,
  ServiceContext as ServiceContext2,
  SilentNotificationHandler,
  DelegationManager,
  SpaceService,
  CapabilityKeyRegistry,
  SharingService,
  UnsupportedFeatureError,
  makePublicSpaceId,
  ACCOUNT_REGISTRY_SPACE,
  BOOTSTRAP_SESSION_REQUESTS,
  SECRET_RECORDS_SCHEMA,
  SECRETS_SPACE as SECRETS_SPACE2,
  TINYCLOUD_SECRETS_BOOTSTRAP_MANIFEST,
  bootstrapSteps,
  ENCRYPTION_PERMISSION_SERVICE as ENCRYPTION_PERMISSION_SERVICE2,
  PermissionNotInManifestError,
  SessionExpiredError,
  expandPermissionEntries as expandPermissionEntriesCore,
  isCapabilitySubset,
  parseRecapCapabilities,
  SERVICE_LONG_TO_SHORT,
  KV as KV2,
  SQL as SQL2,
  DUCKDB as DUCKDB2,
  ENCRYPTION as ENCRYPTION2,
  EXPIRY as EXPIRY3,
  canonicalHashHex,
  canonicalizeEncryptionJson,
  verifyDidKeyEd25519Signature,
  canonicalizeAddress as canonicalizeAddress2,
  pkhDid as pkhDid2,
  resolveTinyCloudHosts as resolveTinyCloudHosts2,
  principalDidEquals as principalDidEquals2,
  parseNetworkId as parseNetworkId2
} from "@tinycloud/sdk-core";

// src/authorization/NodeUserAuthorization.ts
import {
  fetchPeerId,
  submitHostDelegation,
  activateSessionWithHost,
  checkNodeInfo,
  AutoApproveSpaceCreationHandler,
  DEFAULT_MANIFEST_SPACE,
  ENCRYPTION_PERMISSION_SERVICE,
  composeManifestRequest,
  parseNetworkId,
  principalDidEquals,
  resourceCapabilitiesToAbilitiesMap,
  resourceCapabilitiesToSpaceAbilitiesMap,
  resolveTinyCloudHosts,
  EXPIRY,
  canonicalizeAddress,
  makePkhSpaceId,
  pkhDid,
  KV,
  SQL,
  DUCKDB,
  CAPABILITIES,
  HOOKS,
  ENCRYPTION
} from "@tinycloud/sdk-core";

// src/authorization/strategies.ts
import { createOpenKeyCallbackSigningStrategy } from "@tinycloud/sdk-core";
var defaultSignStrategy = { type: "auto-sign" };

// src/storage/MemorySessionStorage.ts
var MemorySessionStorage = class {
  constructor() {
    this.sessions = /* @__PURE__ */ new Map();
  }
  /**
   * Save a session for an address.
   */
  async save(address, session) {
    const normalizedAddress = address.toLowerCase();
    this.sessions.set(normalizedAddress, session);
  }
  /**
   * Load a session for an address.
   */
  async load(address) {
    const normalizedAddress = address.toLowerCase();
    const session = this.sessions.get(normalizedAddress);
    if (!session) {
      return null;
    }
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < /* @__PURE__ */ new Date()) {
      this.sessions.delete(normalizedAddress);
      return null;
    }
    return session;
  }
  /**
   * Clear a session for an address.
   */
  async clear(address) {
    const normalizedAddress = address.toLowerCase();
    this.sessions.delete(normalizedAddress);
  }
  /**
   * Check if a session exists for an address.
   */
  exists(address) {
    const normalizedAddress = address.toLowerCase();
    const session = this.sessions.get(normalizedAddress);
    if (!session) {
      return false;
    }
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < /* @__PURE__ */ new Date()) {
      this.sessions.delete(normalizedAddress);
      return false;
    }
    return true;
  }
  /**
   * Memory storage is always available.
   */
  isAvailable() {
    return true;
  }
  /**
   * Clear all sessions.
   */
  clearAll() {
    this.sessions.clear();
  }
  /**
   * Get the number of stored sessions.
   */
  size() {
    return this.sessions.size;
  }
};

// src/authorization/NodeUserAuthorization.ts
var DECRYPT_ACTION = ENCRYPTION.DECRYPT;
var NETWORK_CREATE_ACTION = ENCRYPTION.NETWORK_CREATE;
function didPrincipalMatches(actual, expected) {
  try {
    return principalDidEquals(actual, expected);
  } catch {
    return actual === expected;
  }
}
function addRawAbility(rawAbilities, resource, action) {
  const actions = rawAbilities[resource];
  if (actions === void 0) {
    rawAbilities[resource] = [action];
    return;
  }
  if (!actions.includes(action)) {
    actions.push(action);
  }
}
var NodeUserAuthorization = class {
  constructor(config) {
    this.extensions = [];
    this._nodeFeatures = [];
    this._lastActivationSkippedSpaceIds = [];
    this.wasm = config.wasmBindings;
    this.signer = config.signer;
    this.signStrategy = config.signStrategy ?? defaultSignStrategy;
    this.sessionStorage = config.sessionStorage ?? new MemorySessionStorage();
    this.domain = config.domain;
    this.uri = config.uri ?? `https://${config.domain}`;
    this.statement = config.statement;
    this.spacePrefix = config.spacePrefix ?? "default";
    this.defaultActions = config.defaultActions ?? {
      kv: {
        "": [KV.PUT, KV.GET, KV.DEL, KV.LIST, KV.METADATA]
      },
      sql: {
        "": [SQL.READ, SQL.WRITE, SQL.SCHEMA, SQL.ADMIN, SQL.EXPORT]
      },
      duckdb: {
        "": [
          DUCKDB.READ,
          DUCKDB.WRITE,
          DUCKDB.ADMIN,
          DUCKDB.DESCRIBE,
          DUCKDB.EXPORT,
          DUCKDB.IMPORT,
          DUCKDB.EXECUTE
        ]
      },
      capabilities: {
        "": [CAPABILITIES.READ]
      },
      hooks: {
        "": [HOOKS.SUBSCRIBE, HOOKS.REGISTER, HOOKS.LIST, HOOKS.UNREGISTER]
      }
    };
    this.sessionExpirationMs = config.sessionExpirationMs ?? EXPIRY.SESSION_MS;
    this.autoCreateSpace = config.autoCreateSpace ?? false;
    this.spaceCreationHandler = config.spaceCreationHandler;
    this.tinycloudHosts = config.tinycloudHosts;
    this.tinycloudRegistryUrl = config.tinycloudRegistryUrl;
    this.tinycloudFallbackHosts = config.tinycloudFallbackHosts;
    this.enablePublicSpace = config.enablePublicSpace ?? true;
    this.nonce = config.nonce;
    this.siweConfig = config.siweConfig;
    this.includeAccountRegistryPermissions = config.includeAccountRegistryPermissions ?? true;
    this._manifest = config.manifest;
    this._capabilityRequest = config.capabilityRequest;
    this.sessionManager = this.wasm.createSessionManager();
  }
  /**
   * Return the manifest currently driving sign-in behavior, or
   * `undefined` if none is set. Used by TinyCloudWeb/TinyCloudNode
   * internals to surface the manifest for requestPermissions flows
   * without forcing the caller to track it separately.
   */
  get manifest() {
    return this._manifest;
  }
  get capabilityRequest() {
    return this.getCapabilityRequest();
  }
  get hosts() {
    return this.tinycloudHosts ? [...this.tinycloudHosts] : [];
  }
  /**
   * Install or replace the stored manifest. Takes effect on the next
   * `signIn()` call — the current session (if any) is not touched.
   */
  setManifest(manifest) {
    this._manifest = manifest;
    this._capabilityRequest = void 0;
  }
  setCapabilityRequest(request) {
    this._capabilityRequest = request;
  }
  /**
   * The current active session (web-core compatible).
   */
  get session() {
    return this._session;
  }
  /**
   * The current TinyCloud session with full delegation data.
   * Includes spaceId, delegationHeader, and delegationCid.
   */
  get tinyCloudSession() {
    return this._tinyCloudSession;
  }
  /**
   * Rehydrate the auth-layer session from previously-persisted delegation
   * data. Used by {@link TinyCloudNode.restoreSession} so that downstream
   * surfaces that read from `tinyCloudSession` (notably
   * `grantRuntimePermissions`, which extracts the SIWE expiry from it) work
   * without re-running the full sign-in flow.
   *
   * Caller must supply the same fields that `signIn` would have written —
   * `siwe` is the load-bearing one because `extractSiweExpiration` returns
   * undefined for missing SIWEs and the SDK then treats the session as
   * expired-at-epoch-zero.
   *
   * @param hosts - The TinyCloud hosts this session was created against,
   *   as persisted in {@link PersistedSessionData.tinycloudHosts}. When
   *   present (and non-empty) they are adopted directly so the restored
   *   session resolves to the same node as the original sign-in without
   *   re-running registry/fallback resolution. When absent (old session)
   *   hosts are resolved lazily on the first host-needing call via
   *   {@link ensureTinyCloudHosts}.
   */
  setRestoredTinyCloudSession(session, hosts) {
    const address = canonicalizeAddress(session.address);
    this._tinyCloudSession = { ...session, address };
    this._address = address;
    this._chainId = session.chainId;
    if ((!this.tinycloudHosts || this.tinycloudHosts.length === 0) && hosts && hosts.length > 0) {
      this.tinycloudHosts = [...hosts];
    }
  }
  /**
   * Ensure `tinycloudHosts` are resolved before a host-needing call.
   *
   * Fresh sign-in resolves hosts up front; a restored session may not have
   * (old persisted sessions predate {@link PersistedSessionData.tinycloudHosts}).
   * This guard makes a restored session resolve the node exactly like a fresh
   * sign-in — persisted hosts are preferred (already set by
   * {@link setRestoredTinyCloudSession}), otherwise the registry/fallback
   * resolution runs lazily here. Idempotent: {@link resolveTinyCloudHostsForSignIn}
   * early-returns when hosts are already set.
   *
   * Throws if hosts are unset and the restored session has no address/chainId
   * to resolve from — a real failure that must surface, not be masked.
   */
  async ensureTinyCloudHosts() {
    if (this.tinycloudHosts && this.tinycloudHosts.length > 0) {
      return;
    }
    if (this._address === void 0 || this._chainId === void 0) {
      throw new Error(
        "Cannot resolve TinyCloud hosts: no address/chainId available. Sign in or restore a session first."
      );
    }
    await this.resolveTinyCloudHostsForSignIn(this._address, this._chainId);
  }
  async resolveTinyCloudHostsForSignIn(address, chainId) {
    if (this.tinycloudHosts && this.tinycloudHosts.length > 0) {
      return;
    }
    const subject = pkhDid(address, chainId);
    const resolved = await resolveTinyCloudHosts(subject, {
      registryUrl: this.tinycloudRegistryUrl,
      fallbackHosts: this.tinycloudFallbackHosts
    });
    this.tinycloudHosts = resolved.hosts;
  }
  requireTinyCloudHosts() {
    if (!this.tinycloudHosts || this.tinycloudHosts.length === 0) {
      throw new Error("TinyCloud hosts have not been resolved. Call signIn() first.");
    }
    return this.tinycloudHosts;
  }
  get primaryTinyCloudHost() {
    return this.requireTinyCloudHosts()[0];
  }
  get nodeFeatures() {
    return this._nodeFeatures;
  }
  get lastActivationSkippedSpaceIds() {
    return [...this._lastActivationSkippedSpaceIds];
  }
  /**
   * Compute the `abilities` map the WASM `prepareSession` call should
   * see at sign-in time.
   *
   * When a manifest is installed, we resolve it and union together:
   * - the app's own `resources` (what it needs at runtime)
   * - every `additionalDelegates[*].permissions` list (what it will
   *   re-delegate to other DIDs post sign-in)
   *
   * into the short-service / path / full-URN-actions shape the WASM
   * layer expects. This is the key invariant that lets
   * {@link TinyCloudNode.delegateTo} issue manifest-declared
   * delegations via the session key (no wallet prompt): the session's
   * own recap already covers every action those delegations need.
   *
   * When no manifest is installed, we fall back to the
   * {@link defaultActions} table so existing callers see no change.
   *
   * This is a pure function of `this._manifest` + `this.defaultActions`
   * — the manifest resolution performs no I/O and throws a
   * {@link ManifestValidationError} on structural problems (missing
   * id/name, unparseable expiry, etc), which will surface at sign-in
   * rather than being silently swallowed.
   *
   * @internal
   */
  getCapabilityRequest() {
    if (this._capabilityRequest !== void 0) {
      return this._capabilityRequest;
    }
    if (this._manifest === void 0) {
      return void 0;
    }
    this._capabilityRequest = composeManifestRequest(
      Array.isArray(this._manifest) ? this._manifest : [this._manifest],
      {
        includeAccountRegistryPermissions: this.includeAccountRegistryPermissions
      }
    );
    return this._capabilityRequest;
  }
  resolveSpaceName(space, address, chainId) {
    if (space.startsWith("tinycloud:")) {
      return space;
    }
    return makePkhSpaceId(address, chainId, space);
  }
  defaultEncryptionNetworkId(address, chainId) {
    return `urn:tinycloud:encryption:${pkhDid(address, chainId)}:default`;
  }
  resolveSignInCapabilities(address, chainId) {
    const request = this.getCapabilityRequest();
    if (request === void 0) {
      const defaultNetworkId = this.defaultEncryptionNetworkId(address, chainId);
      const primarySpaceId2 = makePkhSpaceId(address, chainId, this.spacePrefix);
      const secretsSpaceId = makePkhSpaceId(address, chainId, "secrets");
      return {
        abilities: this.defaultActions,
        spaceId: primarySpaceId2,
        spaceAbilities: {
          [primarySpaceId2]: this.defaultActions,
          [secretsSpaceId]: {
            kv: {
              "vault/secrets/": [
                KV.GET,
                KV.PUT,
                KV.DEL,
                KV.LIST,
                KV.METADATA
              ]
            }
          }
        },
        rawAbilities: {
          [defaultNetworkId]: [DECRYPT_ACTION, NETWORK_CREATE_ACTION]
        }
      };
    }
    const rawAbilities = {};
    const currentDid = pkhDid(address, chainId);
    const spaceResources = request.resources.filter((entry) => {
      if (entry.service !== ENCRYPTION_PERMISSION_SERVICE) {
        return true;
      }
      for (const action of entry.actions) {
        addRawAbility(rawAbilities, entry.path, action);
      }
      if (entry.actions.includes(DECRYPT_ACTION)) {
        const parsed = parseNetworkId(entry.path);
        if (didPrincipalMatches(parsed.ownerDid, currentDid)) {
          addRawAbility(rawAbilities, entry.path, NETWORK_CREATE_ACTION);
        }
      }
      return false;
    });
    const primarySpaceName = spaceResources.find((entry) => entry.space !== "account")?.space ?? DEFAULT_MANIFEST_SPACE;
    const primarySpaceId = this.resolveSpaceName(
      primarySpaceName,
      address,
      chainId
    );
    const bySpace = resourceCapabilitiesToSpaceAbilitiesMap(spaceResources);
    const spaceAbilities = {};
    for (const [space, abilities] of Object.entries(bySpace)) {
      spaceAbilities[this.resolveSpaceName(space, address, chainId)] = abilities;
    }
    return {
      abilities: spaceAbilities[primarySpaceId] ?? resourceCapabilitiesToAbilitiesMap([]),
      spaceId: primarySpaceId,
      spaceAbilities,
      rawAbilities: Object.keys(rawAbilities).length > 0 ? rawAbilities : void 0
    };
  }
  /**
   * Build SIWE overrides from the top-level nonce and siweConfig.
   * - Top-level `nonce` is seeded first so `siweConfig.nonce` wins if both are set.
   * - statement is prepended to the default statement
   * - resources are appended to the default resources
   * - uri triggers a warning (overwriting delegation target)
   * - all other fields override directly
   * - per-call nonce overrides siweConfig.nonce when provided
   */
  buildSiweOverrides(options) {
    const base2 = { uri: this.uri };
    if (this.nonce !== void 0) {
      base2.nonce = this.nonce;
    }
    if (!this.siweConfig && !options?.nonce) {
      return base2;
    }
    const { statement, resources, uri, ...rest } = this.siweConfig ?? {};
    const overrides = { ...base2, ...rest };
    if (statement) {
      overrides.statement = this.statement ? `${statement} ${this.statement}` : statement;
    }
    if (resources && resources.length > 0) {
      overrides.resources = resources;
    }
    if (uri) {
      console.warn(
        "[tinycloud] siweConfig.uri is overwriting the delegation target URI. This may break delegation chain validation if the URI does not match the session key DID."
      );
      overrides.uri = uri;
    }
    if (options?.nonce) {
      overrides.nonce = options.nonce;
    }
    return overrides;
  }
  /**
   * Add an extension to the authorization flow.
   */
  extend(extension) {
    this.extensions.push(extension);
  }
  /**
   * Get the space ID for the current session.
   */
  getSpaceId() {
    return this._tinyCloudSession?.spaceId;
  }
  /**
   * Create the space on the TinyCloud server (host delegation).
   * This registers the user as the owner of the space.
   */
  async hostSpace(targetSpaceId, purpose) {
    if (!this._tinyCloudSession || !this._address || !this._chainId) {
      throw new Error("Must be signed in to host space");
    }
    await this.ensureTinyCloudHosts();
    const host = this.primaryTinyCloudHost;
    const spaceId = targetSpaceId ?? this._tinyCloudSession.spaceId;
    const peerId = await fetchPeerId(host, spaceId);
    const siwe = this.wasm.generateHostSIWEMessage({
      address: this._address,
      chainId: this._chainId,
      domain: this.domain,
      issuedAt: (/* @__PURE__ */ new Date()).toISOString(),
      spaceId,
      peerId
    });
    const signature2 = await this.signMessage(siwe, purpose);
    const headers = this.wasm.siweToDelegationHeaders({ siwe, signature: signature2 });
    const result = await submitHostDelegation(host, headers);
    return result.success;
  }
  /**
   * Create a specific space on the server via host delegation.
   * Used for lazy creation of additional spaces (e.g., public).
   */
  async hostPublicSpace(spaceId) {
    return this.hostSpace(spaceId);
  }
  /**
   * Create a specific owned space on the server via host delegation.
   * Used by manifest registry setup for the account space.
   */
  async hostOwnedSpace(spaceId, purpose) {
    return this.hostSpace(spaceId, purpose);
  }
  /**
   * Ensure the user's space exists on the TinyCloud server.
   * Creates the space if it doesn't exist and autoCreateSpace is enabled.
   * If autoCreateSpace is false and space doesn't exist, silently returns
   * (user may be using delegations to access other spaces).
   *
   * @throws Error if space creation fails
   */
  async ensureSpaceExists() {
    if (!this._tinyCloudSession) {
      throw new Error("Must be signed in to ensure space exists");
    }
    await this.ensureTinyCloudHosts();
    const host = this.primaryTinyCloudHost;
    const primarySpaceId = this._tinyCloudSession.spaceId;
    const result = await activateSessionWithHost(
      host,
      this._tinyCloudSession.delegationHeader
    );
    this.recordActivationSkippedSpaces(result, primarySpaceId);
    const handler = this.spaceCreationHandler ?? (this.autoCreateSpace ? new AutoApproveSpaceCreationHandler() : void 0);
    const creationContext = {
      spaceId: primarySpaceId,
      address: this._address,
      chainId: this._chainId,
      host
    };
    if (result.success) {
      const primarySkipped = result.skipped?.includes(primarySpaceId);
      if (!primarySkipped) {
        return;
      }
      if (!handler) {
        return;
      }
      const confirmed = await handler.confirmSpaceCreation(creationContext);
      if (!confirmed) {
        return;
      }
      try {
        const created = await this.hostSpace();
        if (!created) {
          const err = new Error(`Failed to create space: ${primarySpaceId}`);
          handler.onSpaceCreationFailed?.(creationContext, err);
          throw err;
        }
      } catch (error) {
        handler.onSpaceCreationFailed?.(
          creationContext,
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      const retryResult = await activateSessionWithHost(
        host,
        this._tinyCloudSession.delegationHeader
      );
      if (!retryResult.success) {
        const err = new Error(
          `Failed to activate session after creating space: ${retryResult.error}`
        );
        handler.onSpaceCreationFailed?.(creationContext, err);
        throw err;
      }
      handler.onSpaceCreated?.(creationContext);
      return;
    }
    if (result.status === 404) {
      if (!handler) {
        return;
      }
      const confirmed = await handler.confirmSpaceCreation(creationContext);
      if (!confirmed) {
        return;
      }
      try {
        const created = await this.hostSpace();
        if (!created) {
          const err = new Error(`Failed to create space: ${primarySpaceId}`);
          handler.onSpaceCreationFailed?.(creationContext, err);
          throw err;
        }
      } catch (error) {
        handler.onSpaceCreationFailed?.(
          creationContext,
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      const retryResult = await activateSessionWithHost(
        host,
        this._tinyCloudSession.delegationHeader
      );
      if (!retryResult.success) {
        const err = new Error(
          `Failed to activate session after creating space: ${retryResult.error}`
        );
        handler.onSpaceCreationFailed?.(creationContext, err);
        throw err;
      }
      handler.onSpaceCreated?.(creationContext);
      return;
    }
    throw new Error(`Failed to activate session: ${result.error}`);
  }
  recordActivationSkippedSpaces(result, primarySpaceId) {
    if (result.success) {
      this._lastActivationSkippedSpaceIds = result.skipped ?? [];
      return;
    }
    this._lastActivationSkippedSpaceIds = result.status === 404 ? [primarySpaceId] : [];
  }
  async createBootstrapSession(options) {
    if (!this._address || !this._chainId) {
      throw new Error("Must be signed in before creating bootstrap sessions");
    }
    const address = this._address;
    const chainId = this._chainId;
    const keyId = `bootstrap-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.sessionManager.createSessionKey(keyId);
    const jwkString = this.sessionManager.jwk(keyId);
    if (!jwkString) {
      throw new Error("Failed to create bootstrap session key");
    }
    const jwk = JSON.parse(jwkString);
    const now = /* @__PURE__ */ new Date();
    const expirationTime = new Date(now.getTime() + this.sessionExpirationMs);
    const abilities = resourceCapabilitiesToAbilitiesMap(
      options.capabilityRequest.resources
    );
    const prepared = this.wasm.prepareSession({
      abilities,
      ...options.rawAbilities !== void 0 ? { rawAbilities: options.rawAbilities } : {},
      address,
      chainId,
      domain: this.domain,
      issuedAt: now.toISOString(),
      expirationTime: expirationTime.toISOString(),
      spaceId: options.spaceId,
      jwk,
      ...this.buildSiweOverrides()
    });
    const signature2 = await this.requestSignature({
      address,
      chainId,
      message: prepared.siwe,
      type: "siwe",
      purpose: "bootstrap-session"
    });
    const session = this.wasm.completeSessionSetup({
      ...prepared,
      signature: signature2
    });
    return {
      address,
      chainId,
      sessionKey: keyId,
      spaceId: options.spaceId,
      delegationCid: session.delegationCid,
      delegationHeader: session.delegationHeader,
      verificationMethod: this.sessionManager.getDID(keyId),
      jwk,
      siwe: prepared.siwe,
      signature: signature2
    };
  }
  /**
   * Sign in and create a new session.
   *
   * This follows the correct SIWE-ReCap flow:
   * 1. Create session key and get JWK
   * 2. Call prepareSession() which generates the SIWE with ReCap capabilities
   * 3. Sign the SIWE string from prepareSession
   * 4. Call completeSessionSetup() with the prepared session + signature
   *
   * @param options - Optional per-call SIWE overrides for this sign-in only
   */
  async signIn(options) {
    this._address = canonicalizeAddress(await this.signer.getAddress());
    this._chainId = await this.signer.getChainId();
    const address = this._address;
    const chainId = this._chainId;
    await this.resolveTinyCloudHostsForSignIn(address, chainId);
    const keyId = `session-${Date.now()}`;
    this.sessionManager.renameSessionKeyId("default", keyId);
    const jwkString = this.sessionManager.jwk(keyId);
    if (!jwkString) {
      throw new Error("Failed to create session key");
    }
    const jwk = JSON.parse(jwkString);
    const capabilityPlan = this.resolveSignInCapabilities(address, chainId);
    const spaceId = capabilityPlan.spaceId;
    const now = /* @__PURE__ */ new Date();
    const expirationTime = new Date(now.getTime() + this.sessionExpirationMs);
    const prepared = this.wasm.prepareSession({
      abilities: capabilityPlan.abilities,
      ...capabilityPlan.spaceAbilities !== void 0 ? { spaceAbilities: capabilityPlan.spaceAbilities } : {},
      ...capabilityPlan.rawAbilities !== void 0 ? { rawAbilities: capabilityPlan.rawAbilities } : {},
      address,
      chainId,
      domain: this.domain,
      issuedAt: now.toISOString(),
      expirationTime: expirationTime.toISOString(),
      spaceId,
      jwk,
      ...this.buildSiweOverrides(options)
    });
    const signature2 = await this.requestSignature({
      address,
      chainId,
      message: prepared.siwe,
      type: "siwe",
      purpose: "sign-in"
    });
    const session = this.wasm.completeSessionSetup({
      ...prepared,
      signature: signature2
    });
    const clientSession = {
      address,
      walletAddress: address,
      chainId,
      sessionKey: keyId,
      siwe: prepared.siwe,
      signature: signature2
    };
    const spacesMetadata = this.enablePublicSpace ? { public: makePkhSpaceId(address, chainId, "public") } : void 0;
    const tinyCloudSession = {
      address,
      chainId,
      sessionKey: keyId,
      spaceId,
      spaces: spacesMetadata,
      delegationCid: session.delegationCid,
      delegationHeader: session.delegationHeader,
      verificationMethod: this.sessionManager.getDID(keyId),
      jwk,
      siwe: prepared.siwe,
      signature: signature2
    };
    const persistedData = {
      address,
      chainId,
      sessionKey: JSON.stringify(jwk),
      siwe: prepared.siwe,
      signature: signature2,
      tinycloudSession: {
        delegationHeader: session.delegationHeader,
        delegationCid: session.delegationCid,
        spaceId,
        spaces: spacesMetadata,
        verificationMethod: this.sessionManager.getDID(keyId)
      },
      expiresAt: expirationTime.toISOString(),
      createdAt: now.toISOString(),
      version: "1.0",
      tinycloudHosts: this.tinycloudHosts
    };
    await this.sessionStorage.save(address, persistedData);
    this._session = clientSession;
    this._tinyCloudSession = tinyCloudSession;
    this._address = address;
    this._chainId = chainId;
    const nodeInfo = await checkNodeInfo(
      this.primaryTinyCloudHost,
      this.wasm.protocolVersion()
    );
    this._nodeFeatures = nodeInfo.features;
    for (const ext of this.extensions) {
      if (ext.afterSignIn) {
        await ext.afterSignIn(clientSession);
      }
    }
    await this.ensureSpaceExists();
    return clientSession;
  }
  /**
   * Sign out and clear the current session.
   */
  async signOut() {
    if (this._address) {
      await this.clearPersistedSession(this._address);
    }
    this._session = void 0;
  }
  /**
   * Get the current wallet/signer address.
   */
  address() {
    return this._address;
  }
  /**
   * Get the current chain ID.
   */
  chainId() {
    return this._chainId;
  }
  /**
   * Sign a message with the connected signer.
   */
  async signMessage(message, purpose) {
    if (!this._address) {
      this._address = canonicalizeAddress(await this.signer.getAddress());
    }
    if (!this._chainId) {
      this._chainId = await this.signer.getChainId();
    }
    return this.requestSignature({
      address: this._address,
      chainId: this._chainId,
      message,
      type: "message",
      ...purpose ? { purpose } : {}
    });
  }
  /**
   * Prepare a session for external signing.
   *
   * Use this method when you need to sign the SIWE message externally (e.g., via
   * a hardware wallet, multi-sig, or external service). After obtaining the signature,
   * call `signInWithPreparedSession()` to complete the sign-in.
   *
   * @example
   * ```typescript
   * const { prepared, keyId, jwk } = await auth.prepareSessionForSigning();
   * const signature = await externalSigner.signMessage(prepared.siwe);
   * const session = await auth.signInWithPreparedSession(prepared, signature, keyId, jwk);
   * ```
   */
  async prepareSessionForSigning() {
    const address = canonicalizeAddress(await this.signer.getAddress());
    const chainId = await this.signer.getChainId();
    const keyId = `session-${Date.now()}`;
    this.sessionManager.renameSessionKeyId("default", keyId);
    const jwkString = this.sessionManager.jwk(keyId);
    if (!jwkString) {
      throw new Error("Failed to create session key");
    }
    const jwk = JSON.parse(jwkString);
    const capabilityPlan = this.resolveSignInCapabilities(address, chainId);
    const spaceId = capabilityPlan.spaceId;
    const now = /* @__PURE__ */ new Date();
    const expirationTime = new Date(now.getTime() + this.sessionExpirationMs);
    const prepared = this.wasm.prepareSession({
      abilities: capabilityPlan.abilities,
      ...capabilityPlan.spaceAbilities !== void 0 ? { spaceAbilities: capabilityPlan.spaceAbilities } : {},
      ...capabilityPlan.rawAbilities !== void 0 ? { rawAbilities: capabilityPlan.rawAbilities } : {},
      address,
      chainId,
      domain: this.domain,
      issuedAt: now.toISOString(),
      expirationTime: expirationTime.toISOString(),
      spaceId,
      jwk,
      ...this.buildSiweOverrides()
    });
    return {
      prepared,
      keyId,
      jwk,
      address,
      chainId
    };
  }
  /**
   * Complete sign-in with a prepared session and signature.
   *
   * Use this method after obtaining a signature for the SIWE message from
   * `prepareSessionForSigning()`. The signature MUST be over `prepared.siwe`.
   *
   * @param prepared - The prepared session from `prepareSessionForSigning()`
   * @param signature - The signature over `prepared.siwe`
   * @param keyId - The session key ID from `prepareSessionForSigning()`
   * @param jwk - The JWK from `prepareSessionForSigning()`
   */
  async signInWithPreparedSession(prepared, signature2, keyId, jwk) {
    const session = this.wasm.completeSessionSetup({
      ...prepared,
      signature: signature2
    });
    const address = canonicalizeAddress(await this.signer.getAddress());
    const chainId = await this.signer.getChainId();
    await this.resolveTinyCloudHostsForSignIn(address, chainId);
    const clientSession = {
      address,
      walletAddress: address,
      chainId,
      sessionKey: keyId,
      siwe: prepared.siwe,
      signature: signature2
    };
    const spacesMetadata = this.enablePublicSpace ? { public: makePkhSpaceId(address, chainId, "public") } : void 0;
    const tinyCloudSession = {
      address,
      chainId,
      sessionKey: keyId,
      spaceId: prepared.spaceId,
      spaces: spacesMetadata,
      delegationCid: session.delegationCid,
      delegationHeader: session.delegationHeader,
      verificationMethod: this.sessionManager.getDID(keyId),
      jwk,
      siwe: prepared.siwe,
      signature: signature2
    };
    const expirationMatch = prepared.siwe.match(/Expiration Time: (.+)/);
    const issuedAtMatch = prepared.siwe.match(/Issued At: (.+)/);
    const expiresAt = expirationMatch?.[1] ?? new Date(Date.now() + this.sessionExpirationMs).toISOString();
    const createdAt = issuedAtMatch?.[1] ?? (/* @__PURE__ */ new Date()).toISOString();
    const persistedData = {
      address,
      chainId,
      sessionKey: JSON.stringify(jwk),
      siwe: prepared.siwe,
      signature: signature2,
      tinycloudSession: {
        delegationHeader: session.delegationHeader,
        delegationCid: session.delegationCid,
        spaceId: prepared.spaceId,
        spaces: spacesMetadata,
        verificationMethod: this.sessionManager.getDID(keyId)
      },
      expiresAt,
      createdAt,
      version: "1.0",
      tinycloudHosts: this.tinycloudHosts
    };
    await this.sessionStorage.save(address, persistedData);
    this._session = clientSession;
    this._tinyCloudSession = tinyCloudSession;
    this._address = address;
    this._chainId = chainId;
    const nodeInfo = await checkNodeInfo(
      this.primaryTinyCloudHost,
      this.wasm.protocolVersion()
    );
    this._nodeFeatures = nodeInfo.features;
    for (const ext of this.extensions) {
      if (ext.afterSignIn) {
        await ext.afterSignIn(clientSession);
      }
    }
    await this.ensureSpaceExists();
    return clientSession;
  }
  /**
   * Clear persisted session data.
   */
  async clearPersistedSession(address) {
    const targetAddress = address ?? this._address;
    if (targetAddress) {
      await this.sessionStorage.clear(targetAddress);
    }
  }
  /**
   * Check if a session is persisted for an address.
   */
  isSessionPersisted(address) {
    return this.sessionStorage.exists(address);
  }
  /**
   * Request a signature based on the configured strategy.
   */
  async requestSignature(request) {
    switch (this.signStrategy.type) {
      case "auto-sign":
        return this.signer.signMessage(request.message);
      case "auto-reject":
        throw new Error("Sign request rejected by auto-reject strategy");
      case "callback": {
        const response = await this.signStrategy.handler(request);
        if (!response.approved) {
          throw new Error(
            response.reason ?? "Sign request rejected by callback"
          );
        }
        return response.signature ?? await this.signer.signMessage(request.message);
      }
      case "event-emitter": {
        return this.requestSignatureViaEmitter(
          request,
          this.signStrategy.emitter,
          this.signStrategy.timeout ?? 6e4
        );
      }
      default:
        throw new Error(
          `Unknown sign strategy: ${this.signStrategy.type}`
        );
    }
  }
  /**
   * Request signature via event emitter with timeout.
   */
  requestSignatureViaEmitter(request, emitter, timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Sign request timed out"));
      }, timeout);
      const respond = async (response) => {
        clearTimeout(timeoutId);
        if (!response.approved) {
          reject(
            new Error(response.reason ?? "Sign request rejected via emitter")
          );
        } else {
          const signature2 = response.signature ?? await this.signer.signMessage(request.message);
          resolve(signature2);
        }
      };
      emitter.emit("sign-request", request, respond);
    });
  }
};

// src/account/AccountService.ts
import { AccountService } from "@tinycloud/sdk-core";

// src/DelegatedAccess.ts
import {
  KVService,
  HooksService,
  SQLService,
  DuckDbService,
  ServiceContext
} from "@tinycloud/sdk-core";
var DelegatedAccess = class {
  constructor(session, delegation, host, invoke2, invokeAny2, telemetry) {
    this.session = session;
    this._delegation = delegation;
    this.host = host;
    this._serviceContext = new ServiceContext({
      invoke: invoke2,
      invokeAny: invokeAny2,
      fetch: globalThis.fetch.bind(globalThis),
      hosts: [host],
      telemetry
    });
    const prefix = this._delegation.path.replace(/\/$/, "");
    this._kv = new KVService({ prefix });
    this._kv.initialize(this._serviceContext);
    this._serviceContext.registerService("kv", this._kv);
    this._sql = new SQLService({});
    this._sql.initialize(this._serviceContext);
    this._serviceContext.registerService("sql", this._sql);
    this._duckdb = new DuckDbService({});
    this._duckdb.initialize(this._serviceContext);
    this._serviceContext.registerService("duckdb", this._duckdb);
    this._hooks = new HooksService({});
    this._hooks.initialize(this._serviceContext);
    this._serviceContext.registerService("hooks", this._hooks);
    const serviceSession = {
      delegationHeader: session.delegationHeader,
      delegationCid: session.delegationCid,
      spaceId: session.spaceId,
      verificationMethod: session.verificationMethod,
      jwk: session.jwk
    };
    this._serviceContext.setSession(serviceSession);
  }
  /**
   * Get the delegation this access was created from.
   */
  get delegation() {
    return this._delegation;
  }
  /**
   * The space ID this access is for.
   */
  get spaceId() {
    return this._delegation.spaceId;
  }
  /**
   * The path this access is scoped to.
   */
  get path() {
    return this._delegation.path;
  }
  /**
   * KV operations on the delegated space.
   */
  get kv() {
    return this._kv;
  }
  /**
   * SQL operations on the delegated space.
   */
  get sql() {
    return this._sql;
  }
  /**
   * DuckDB operations on the delegated space.
   */
  get duckdb() {
    return this._duckdb;
  }
  /**
   * Hooks write-stream subscriptions on the delegated space.
   */
  get hooks() {
    return this._hooks;
  }
  /**
   * Export the handles needed to rehydrate this activated delegation via
   * `TinyCloudNode.restoreSession(...)` in another process or after a
   * restart.
   *
   * See `RestorableSession` for lifetime caveats.
   */
  get restorable() {
    return {
      delegationHeader: this.session.delegationHeader,
      delegationCid: this.session.delegationCid,
      spaceId: this.session.spaceId,
      jwk: this.session.jwk,
      verificationMethod: this.session.verificationMethod,
      address: this.session.address,
      chainId: this.session.chainId
    };
  }
};

// src/keys/WasmKeyProvider.ts
var WasmKeyProvider = class {
  /**
   * Create a new WasmKeyProvider.
   *
   * @param config - Configuration with the WASM session manager
   */
  constructor(config) {
    this.sessionManager = config.sessionManager;
  }
  /**
   * Generate a new session key with the given name.
   *
   * This creates a new Ed25519 key pair in the WASM session manager.
   * The key can then be used for signing delegations in sharing links.
   *
   * @param name - A unique name/ID for the key (e.g., "share:timestamp:random")
   * @returns The key ID (same as the name provided)
   */
  async createSessionKey(name) {
    return this.sessionManager.createSessionKey(name);
  }
  /**
   * Get the JWK (JSON Web Key) for a key.
   *
   * Returns the full JWK including the private key (d parameter),
   * which is required for signing and for embedding in sharing links.
   *
   * @param keyId - The key ID to retrieve
   * @returns The JWK object with public and private key components
   * @throws Error if the key is not found
   */
  getJWK(keyId) {
    const jwkJson = this.sessionManager.jwk(keyId);
    if (!jwkJson) {
      throw new Error(`Key not found: ${keyId}`);
    }
    return JSON.parse(jwkJson);
  }
  /**
   * Get the DID (Decentralized Identifier) for a key.
   *
   * Returns the did:key format DID derived from the key's public key.
   * This DID can be used as the delegatee in delegations.
   *
   * @param keyId - The key ID to retrieve
   * @returns The DID in did:key format (e.g., "did:key:z6Mk...")
   */
  async getDID(keyId) {
    return this.sessionManager.getDID(keyId);
  }
  /**
   * List all session keys currently held by the provider.
   *
   * @returns Array of key IDs
   */
  listKeys() {
    const keys = this.sessionManager.listSessionKeys?.();
    return Array.isArray(keys) ? keys : [];
  }
  /**
   * Check if a key exists in the provider.
   *
   * @param keyId - The key ID to check
   * @returns True if the key exists
   */
  hasKey(keyId) {
    const jwk = this.sessionManager.jwk(keyId);
    return jwk !== void 0;
  }
};
function createWasmKeyProvider(sessionManager) {
  return new WasmKeyProvider({ sessionManager });
}

// src/delegateToHelpers.ts
import {
  parseExpiry,
  SiweMessage,
  EXPIRY as EXPIRY2
} from "@tinycloud/sdk-core";
function legacyParamsToPermissionEntries(actions, path, spaceIdOverride) {
  const byService = /* @__PURE__ */ new Map();
  for (const a of actions) {
    const slashIdx = a.indexOf("/");
    if (slashIdx === -1) {
      continue;
    }
    const service = a.slice(0, slashIdx);
    if (!service.startsWith("tinycloud.")) {
      continue;
    }
    const list = byService.get(service);
    if (list === void 0) {
      byService.set(service, [a]);
    } else {
      list.push(a);
    }
  }
  const space = spaceIdOverride ?? "default";
  const entries = [];
  for (const [service, actionList] of byService) {
    entries.push({
      service,
      space,
      path,
      actions: actionList
    });
  }
  return entries;
}
var DEFAULT_DELEGATION_EXPIRY_MS = EXPIRY2.SESSION_MS;
function resolveExpiryMs(expiry) {
  if (expiry === void 0) {
    return DEFAULT_DELEGATION_EXPIRY_MS;
  }
  if (typeof expiry === "number") {
    if (!Number.isFinite(expiry) || expiry <= 0) {
      throw new Error(
        `delegateTo expiry must be a positive finite number (got ${expiry})`
      );
    }
    return expiry;
  }
  return parseExpiry(expiry);
}
function extractSiweExpiration(siwe) {
  const parsed = new SiweMessage(siwe);
  if (parsed.expirationTime === void 0 || parsed.expirationTime === null) {
    return void 0;
  }
  const d = new Date(parsed.expirationTime);
  if (Number.isNaN(d.getTime())) {
    throw new Error(
      `Session SIWE has unparseable expirationTime: ${parsed.expirationTime}`
    );
  }
  return d;
}

// src/NodeSecretsService.ts
import {
  ErrorCodes,
  resolveSecretListPrefix,
  resolveSecretPath,
  expandPermissionEntries,
  resolveManifest
} from "@tinycloud/sdk-core";
var SECRETS_SPACE = "secrets";
function ok() {
  return { ok: true, data: void 0 };
}
function secretsError(code, message, cause) {
  return {
    ok: false,
    error: {
      code,
      service: "secrets",
      message,
      ...cause ? { cause } : {}
    }
  };
}
function displayActionUrn(action) {
  switch (action) {
    case "get":
      return "tinycloud.kv/get";
    case "put":
      return "tinycloud.kv/put";
    case "del":
      return "tinycloud.kv/del";
    case "list":
      return "tinycloud.kv/list";
  }
}
function secretActionName(action) {
  return action;
}
function secretPermissionEntries(name, options, action, space, encryptionNetworkId) {
  const entries = [];
  const path = action === "list" ? resolveSecretListPrefix(options) : resolveSecretPath(name, options).permissionPaths.vault;
  entries.push({
    service: "tinycloud.kv",
    space,
    path,
    actions: [secretActionName(action)],
    skipPrefix: true
  });
  if (action === "get" && encryptionNetworkId !== void 0) {
    entries.push({
      service: "tinycloud.encryption",
      path: encryptionNetworkId,
      actions: ["decrypt"],
      skipPrefix: true
    });
  }
  return entries;
}
function normalizeSpace(space, resolveSpace) {
  if (!space) return void 0;
  if (space.startsWith("tinycloud:")) return space;
  return resolveSpace?.(space) ?? space;
}
function spaceMatches(granted, requested, resolveSpace) {
  if (!granted || !requested) return false;
  return normalizeSpace(granted, resolveSpace) === normalizeSpace(requested, resolveSpace);
}
var NodeSecretsService = class {
  constructor(config) {
    this.config = config;
    this.shouldRestoreUnlock = false;
  }
  get space() {
    return this.config.space ?? SECRETS_SPACE;
  }
  get vault() {
    return this.service.vault;
  }
  get isUnlocked() {
    return this.service.isUnlocked;
  }
  async unlock(signer) {
    const effectiveSigner = signer ?? this.config.getUnlockSigner?.();
    if (effectiveSigner !== void 0) {
      this.unlockSigner = effectiveSigner;
    }
    const result = await this.service.unlock(effectiveSigner);
    if (result.ok) {
      this.shouldRestoreUnlock = true;
    }
    return result;
  }
  lock() {
    this.shouldRestoreUnlock = false;
    this.service.lock();
  }
  async get(name, options) {
    const permission = await this.ensurePermission(name, options, "get");
    if (!permission.ok) return permission;
    return options === void 0 ? this.service.get(name) : this.service.get(name, options);
  }
  async put(name, value, options) {
    const permission = await this.ensurePermission(name, options, "put");
    if (!permission.ok) return permission;
    return options === void 0 ? this.service.put(name, value) : this.service.put(name, value, options);
  }
  async delete(name, options) {
    const permission = await this.ensurePermission(name, options, "del");
    if (!permission.ok) return permission;
    return options === void 0 ? this.service.delete(name) : this.service.delete(name, options);
  }
  async list(options) {
    const permission = await this.ensurePermission("", options, "list");
    if (!permission.ok) return permission;
    return options === void 0 ? this.service.list() : this.service.list(options);
  }
  get service() {
    return this.config.getService();
  }
  async ensurePermission(name, options, action) {
    const target = name || "secrets";
    let permissionEntries;
    try {
      permissionEntries = secretPermissionEntries(
        name,
        options,
        action,
        this.space,
        action === "get" ? this.config.getEncryptionNetworkId?.() : void 0
      );
    } catch (error) {
      return secretsError(
        ErrorCodes.INVALID_INPUT,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : void 0
      );
    }
    if (this.hasPermission(permissionEntries)) {
      return ok();
    }
    if (!this.config.canEscalate()) {
      return secretsError(
        ErrorCodes.PERMISSION_DENIED,
        `Cannot autosign ${displayActionUrn(action)} for ${target}; TinyCloudNode needs wallet mode with a signer or privateKey.`
      );
    }
    try {
      await this.config.grantPermissions(permissionEntries);
      return this.restoreUnlockAfterEscalation();
    } catch (error) {
      return secretsError(
        ErrorCodes.PERMISSION_DENIED,
        error instanceof Error ? error.message : `Autosign escalation for ${displayActionUrn(action)} on ${target} failed.`,
        error instanceof Error ? error : void 0
      );
    }
  }
  async restoreUnlockAfterEscalation() {
    if (!this.shouldRestoreUnlock) {
      return ok();
    }
    return this.service.unlock(this.unlockSigner);
  }
  hasPermission(permissionEntries) {
    if (this.config.hasPermissions?.(permissionEntries)) {
      return true;
    }
    const manifest = this.config.getManifest();
    if (manifest === void 0) {
      return false;
    }
    const manifests = Array.isArray(manifest) ? manifest : [manifest];
    const requestedEntries = expandPermissionEntries(permissionEntries);
    return requestedEntries.every(
      (entry) => manifests.some((candidate) => {
        const resolved = resolveManifest(candidate);
        return resolved.resources.some(
          (resource) => resource.service === entry.service && spaceMatches(resource.space, entry.space, this.config.resolveSpace) && resource.path === entry.path && entry.actions.every((action) => resource.actions.includes(action))
        );
      })
    );
  }
};

// src/TinyCloudNode.ts
var DEFAULT_HOST = "https://node.tinycloud.xyz";
var DEFAULT_ENCRYPTION_NETWORK_NAME = "default";
var NETWORK_CREATE_ACTION2 = ENCRYPTION2.NETWORK_CREATE;
var DECRYPT_ACTION2 = ENCRYPTION2.DECRYPT;
var NETWORK_ADMIN_TYPE = "tinycloud.encryption.network-admin/v1";
var ROOT_DELEGATION_ACTIONS = [
  KV2.PUT,
  KV2.GET,
  KV2.DEL,
  KV2.LIST,
  KV2.METADATA,
  SQL2.READ,
  SQL2.WRITE,
  SQL2.ADMIN,
  SQL2.ALL,
  DUCKDB2.READ,
  DUCKDB2.WRITE,
  DUCKDB2.ADMIN,
  DUCKDB2.DESCRIBE,
  DUCKDB2.EXPORT,
  DUCKDB2.IMPORT,
  DUCKDB2.ALL
];
var DEFAULT_SESSION_EXPIRATION_MS = EXPIRY3.SESSION_MS;
function decodeAuthorizationBytes(authorization) {
  const encoded = authorization.replace(/^Bearer /i, "");
  const match = /^([A-Za-z0-9_-]+)(={1,2})?$/.exec(encoded);
  const unpadded = match?.[1];
  const paddingLength = match?.[2]?.length ?? 0;
  const remainder = unpadded === void 0 ? 1 : unpadded.length % 4;
  const expectedPaddingLength = remainder === 2 ? 2 : remainder === 3 ? 1 : 0;
  if (unpadded === void 0 || remainder === 1 || paddingLength !== 0 && paddingLength !== expectedPaddingLength) {
    throw new Error("Delegation Authorization is not canonical base64url DAG-CBOR");
  }
  const decoded = Uint8Array.from(Buffer.from(unpadded, "base64url"));
  if (Buffer.from(decoded).toString("base64url") !== unpadded) {
    throw new Error("Delegation Authorization is not canonical base64url DAG-CBOR");
  }
  return decoded;
}
function isOpenKeyAutoSignStrategy(strategy) {
  return strategy?.openKeyAutoSign === true;
}
function isInteractiveSigner(config) {
  if (config.privateKey) {
    return false;
  }
  if (isOpenKeyAutoSignStrategy(config.signStrategy)) {
    return false;
  }
  return config.signer !== void 0;
}
function didPrincipalMatches2(actual, expected) {
  try {
    return principalDidEquals2(actual, expected);
  } catch {
    return actual === expected;
  }
}
function sharingActionsToAbilities(path, actions) {
  var _a;
  const abilities = {};
  for (const action of actions) {
    const slash = action.indexOf("/");
    if (slash === -1) return void 0;
    const shortService = SERVICE_LONG_TO_SHORT[action.slice(0, slash)];
    if (shortService === void 0) return void 0;
    abilities[shortService] ?? (abilities[shortService] = {});
    (_a = abilities[shortService])[path] ?? (_a[path] = []);
    abilities[shortService][path].push(action);
  }
  return Object.keys(abilities).length > 0 ? abilities : void 0;
}
function base64UrlEncode(bytes) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const triplet = a << 16 | (b ?? 0) << 8 | (c ?? 0);
    output += alphabet[triplet >> 18 & 63];
    output += alphabet[triplet >> 12 & 63];
    if (i + 1 < bytes.length) output += alphabet[triplet >> 6 & 63];
    if (i + 2 < bytes.length) output += alphabet[triplet & 63];
  }
  return output;
}
function base64UrlDecode(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (const char of value) {
    const index = alphabet.indexOf(char);
    if (index < 0) {
      throw new Error("invalid base64url input");
    }
    buffer = buffer << 6 | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push(buffer >> bits & 255);
    }
  }
  return new Uint8Array(bytes);
}
async function signJwtInputWithJwk(signingInput, jwk) {
  const bytes = new TextEncoder().encode(signingInput);
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      throw new Error("WebCrypto subtle API is unavailable");
    }
    const key2 = await subtle.importKey(
      "jwk",
      jwk,
      { name: "Ed25519" },
      false,
      ["sign"]
    );
    return new Uint8Array(await subtle.sign({ name: "Ed25519" }, key2, bytes));
  } catch {
    const nodeCrypto = await import("crypto");
    const key2 = nodeCrypto.createPrivateKey({ key: jwk, format: "jwk" });
    return new Uint8Array(nodeCrypto.sign(null, Buffer.from(bytes), key2));
  }
}
async function rewriteInvocationAudience(authorization, audience, jwk) {
  const [headerPart, payloadPart] = authorization.split(".");
  if (!headerPart || !payloadPart) {
    throw new Error("invalid invocation authorization");
  }
  const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerPart)));
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadPart)));
  payload.aud = audience;
  const signingInput = `${base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header))
  )}.${base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)))}`;
  const signature2 = await signJwtInputWithJwk(signingInput, jwk);
  return `${signingInput}.${base64UrlEncode(signature2)}`;
}
function authorizationHeader(headers) {
  if (Array.isArray(headers)) {
    const entry = headers.find(([name]) => name.toLowerCase() === "authorization");
    if (!entry) {
      throw new Error("network invocation did not include an Authorization header");
    }
    return entry[1];
  }
  const value = headers.Authorization ?? headers.authorization;
  if (!value) {
    throw new Error("network invocation did not include an Authorization header");
  }
  return value;
}
var _TinyCloudNode = class _TinyCloudNode {
  /**
   * Create a new TinyCloudNode instance.
   *
   * All configuration is optional. Without a privateKey, the instance operates
   * in "session-only" mode where it can receive delegations but cannot create
   * its own space via signIn().
   *
   * @param config - Configuration options (all optional)
   *
   * @example
   * ```typescript
   * // Session-only mode - can receive delegations
   * const bob = new TinyCloudNode();
   * console.log(bob.did); // did:key:z6Mk... - available immediately
   *
   * // Wallet mode - can create own space
   * const alice = new TinyCloudNode({
   *   privateKey: process.env.ALICE_PRIVATE_KEY,
   *   prefix: "myapp",
   * });
   * await alice.signIn();
   * ```
   */
  constructor(config = {}) {
    this.signer = null;
    this.auth = null;
    this.tc = null;
    this._chainId = 1;
    this._baseSecrets = /* @__PURE__ */ new Map();
    this._secrets = /* @__PURE__ */ new Map();
    this.runtimePermissionGrants = [];
    /**
     * True when the last signIn() detected an interactive signer and skipped
     * client-side bootstrap. Apps can read this to know whether bootstrap was
     * deferred to the server (OpenKey) or requires a separate user action.
     */
    this._bootstrapSkipped = false;
    /**
     * Outcome of the last signIn()'s account-bootstrap attempt. `skipped` is
     * true when bootstrap did not complete (interactive signer, auto-sign
     * denied, or a bootstrap step failed); `reason` carries the cause so apps
     * can surface a "finish account setup" call-to-action.
     */
    this._bootstrapStatus = {
      skipped: false
    };
    this.invokeWithRuntimePermissions = (session, service, path, action, facts) => {
      return this.wasmBindings.invoke(
        this.selectInvocationSession(session, service, path, action),
        service,
        path,
        action,
        facts
      );
    };
    this.invokeAnyWithRuntimePermissions = (session, entries, facts) => {
      if (!this.wasmBindings.invokeAny) {
        throw new Error("WASM binding does not support invokeAny");
      }
      const grant = this.findGrantForOperations(
        entries.flatMap((entry) => {
          const operation = this.operationFromInvokeAnyEntry(entry);
          return operation ? [operation] : [];
        })
      );
      return this.wasmBindings.invokeAny(grant?.session ?? session, entries, facts);
    };
    this.explicitHost = config.host;
    this.config = {
      ...config,
      host: config.host ?? DEFAULT_HOST
    };
    if (config.wasmBindings) {
      this.wasmBindings = config.wasmBindings;
    } else if (_TinyCloudNode.nodeDefaults) {
      this.wasmBindings = _TinyCloudNode.nodeDefaults.createWasmBindings();
    } else {
      throw new Error(
        "wasmBindings must be provided in config. Import from '@tinycloud/node-sdk' (not '/core') for automatic Node.js defaults."
      );
    }
    this.sessionManager = this.wasmBindings.createSessionManager();
    const defaultKeyId = "default";
    let jwkStr = this.sessionManager.jwk(defaultKeyId);
    if (jwkStr) {
      this.sessionKeyId = defaultKeyId;
    } else {
      this.sessionKeyId = this.sessionManager.createSessionKey(defaultKeyId);
      jwkStr = this.sessionManager.jwk(this.sessionKeyId);
    }
    if (!jwkStr) {
      throw new Error("Failed to get session key JWK");
    }
    this.sessionKeyJwk = JSON.parse(jwkStr);
    this._capabilityRegistry = new CapabilityKeyRegistry();
    this._keyProvider = new WasmKeyProvider({
      sessionManager: this.sessionManager
    });
    this.notificationHandler = config.notificationHandler ?? new SilentNotificationHandler();
    this._sharingService = new SharingService({
      hosts: [this.config.host],
      // session: undefined - not needed for receive()
      invoke: this.invokeWithRuntimePermissions,
      fetch: globalThis.fetch.bind(globalThis),
      keyProvider: this._keyProvider,
      registry: this._capabilityRegistry,
      // delegationManager: undefined - not needed for receive()
      createKVService: (config2) => {
        const prefix = config2.pathPrefix?.replace(/\/$/, "");
        const kvService = new KVService2({ prefix });
        const kvContext = new ServiceContext2({
          invoke: config2.invoke,
          fetch: config2.fetch ?? globalThis.fetch.bind(globalThis),
          hosts: config2.hosts,
          telemetry: this.config.telemetry
        });
        kvContext.setSession(config2.session);
        kvService.initialize(kvContext);
        return kvService;
      }
    });
    if (config.signer) {
      this.signer = config.signer;
      this.setupAuth(config);
    } else if (config.privateKey) {
      if (!_TinyCloudNode.nodeDefaults) {
        throw new Error(
          "privateKey requires PrivateKeySigner. Either provide a signer in config, or import from '@tinycloud/node-sdk' (not '/core') for automatic Node.js defaults."
        );
      }
      this.signer = _TinyCloudNode.nodeDefaults.createSigner(config.privateKey, this._chainId);
      this.setupAuth(config);
    }
  }
  /** @internal Register Node.js-specific defaults (NodeWasmBindings, PrivateKeySigner) */
  static registerNodeDefaults(defaults) {
    _TinyCloudNode.nodeDefaults = defaults;
  }
  /** Whether the last signIn() skipped client-side bootstrap because the
   * signer is interactive (browser wallet / EIP-1193 provider). */
  get bootstrapSkipped() {
    return this._bootstrapSkipped;
  }
  /** Outcome of the last signIn()'s account-bootstrap attempt. */
  get bootstrapStatus() {
    return this._bootstrapStatus;
  }
  get nodeFeatures() {
    return this.auth?.nodeFeatures ?? [];
  }
  /** SIWE domain — uses config override or defaults to app.tinycloud.xyz */
  get siweDomain() {
    return this.config.domain ?? "app.tinycloud.xyz";
  }
  /**
   * Set up authorization handler and TinyCloud instance.
   * @internal
   */
  setupAuth(config) {
    const useBootstrapSignInRequest = this.shouldUseBootstrapSignInRequest(config);
    this.auth = new NodeUserAuthorization({
      signer: this.signer,
      signStrategy: config.signStrategy ?? { type: "auto-sign" },
      wasmBindings: this.wasmBindings,
      sessionStorage: config.sessionStorage ?? new MemorySessionStorage(),
      domain: this.siweDomain,
      spacePrefix: config.prefix,
      sessionExpirationMs: config.sessionExpirationMs ?? DEFAULT_SESSION_EXPIRATION_MS,
      tinycloudHosts: this.explicitHost ? [this.explicitHost] : void 0,
      tinycloudRegistryUrl: config.tinycloudRegistryUrl,
      tinycloudFallbackHosts: config.tinycloudFallbackHosts,
      autoCreateSpace: useBootstrapSignInRequest ? false : config.autoCreateSpace,
      enablePublicSpace: config.enablePublicSpace ?? true,
      spaceCreationHandler: useBootstrapSignInRequest ? void 0 : config.spaceCreationHandler,
      nonce: config.nonce,
      siweConfig: config.siweConfig,
      manifest: useBootstrapSignInRequest ? void 0 : config.manifest,
      capabilityRequest: useBootstrapSignInRequest ? BOOTSTRAP_SESSION_REQUESTS.default : config.capabilityRequest,
      includeAccountRegistryPermissions: useBootstrapSignInRequest ? false : config.includeAccountRegistryPermissions
    });
    this.tc = new TinyCloud(this.auth, {
      invokeAny: this.invokeAnyWithRuntimePermissions,
      telemetry: config.telemetry
    });
  }
  shouldUseBootstrapSignInRequest(config) {
    return config.autoBootstrapAccount !== false && config.manifest === void 0 && config.capabilityRequest === void 0 && (config.prefix ?? "default") === "default" && isOpenKeyAutoSignStrategy(config.signStrategy);
  }
  syncResolvedHostFromAuth() {
    const host = this.auth?.hosts[0];
    if (host) {
      this.config.host = host;
    }
  }
  /**
   * Install or replace the manifest that drives the SIWE recap at
   * sign-in. Takes effect on the next `signIn()` call — the current
   * session (if any) is not touched. Wire this up from a higher
   * layer (e.g. TinyCloudWeb.setManifest) so the manifest is kept
   * in sync across the stack.
   */
  setManifest(manifest) {
    if (!this.auth) {
      throw new Error(
        "setManifest requires wallet mode. Provide a signer or privateKey in the TinyCloudNode config."
      );
    }
    this.config.manifest = manifest;
    this.config.capabilityRequest = void 0;
    this.auth.setManifest(manifest);
  }
  setCapabilityRequest(request) {
    if (!this.auth) {
      throw new Error(
        "setCapabilityRequest requires wallet mode. Provide a signer or privateKey in the TinyCloudNode config."
      );
    }
    this.config.capabilityRequest = request;
    this.config.manifest = request?.manifests;
    this.auth.setCapabilityRequest(request);
  }
  /**
   * Return the manifest currently installed on the auth handler,
   * or `undefined` if none is set.
   */
  get manifest() {
    return this.auth?.manifest;
  }
  get capabilityRequest() {
    return this.auth?.capabilityRequest;
  }
  get hosts() {
    const authHosts = this.auth?.hosts ?? [];
    return authHosts.length > 0 ? authHosts : [this.config.host];
  }
  /**
   * Get the primary identity DID for this user.
   * - If wallet connected and signed in: returns PKH DID (did:pkh:eip155:{chainId}:{address})
   * - If session-only mode: returns session key DID (did:key:z6Mk...)
   *
   * Use this for delegations - it always returns the appropriate identity.
   */
  get did() {
    if (this._address) {
      return pkhDid2(this._address, this._chainId);
    }
    return this.sessionManager.getDID(this.sessionKeyId);
  }
  /**
   * Get the session key DID. Always available.
   * Format: did:key:z6Mk...#z6Mk...
   *
   * Use this when you specifically need the session key, not the user identity.
   */
  get sessionDid() {
    return this.sessionManager.getDID(this.sessionKeyId);
  }
  /**
   * Get the Ethereum address for this user.
   */
  get address() {
    return this.auth?.address() ?? this._address;
  }
  /**
   * Check if this instance is in session-only mode (no wallet).
   * In session-only mode, the instance can receive delegations but cannot
   * create its own space via signIn().
   */
  get isSessionOnly() {
    return this.signer === null;
  }
  /**
   * Get the space ID for this user.
   * Available after signIn().
   */
  get spaceId() {
    return this.auth?.tinyCloudSession?.spaceId;
  }
  /**
   * Get the account space ID for this wallet identity.
   * Available after wallet-backed sign-in or a restored session with address metadata.
   */
  get accountSpaceId() {
    if (!this._address) {
      return void 0;
    }
    return this.wasmBindings.makeSpaceId(this._address, this._chainId, ACCOUNT_REGISTRY_SPACE);
  }
  /**
   * Account-level application and delegation helpers.
   */
  get account() {
    if (!this._account) {
      this._account = new AccountService({
        getDid: () => this.did,
        getHost: () => this.hosts[0] ?? this.config.host,
        getPrimarySpaceId: () => this.spaceId,
        getAccountSpaceId: () => this.accountSpaceId,
        getSpaces: () => this.spaces,
        getAccountDb: () => this.accountSpaceId ? this.sqlForSpace(this.accountSpaceId).db("account") : void 0,
        ensureAccountSpaceHosted: async () => {
          if (this.accountSpaceId && this.auth) {
            await this.ensureOwnedSpaceHostedById(this.accountSpaceId);
          }
        }
      });
    }
    return this._account;
  }
  /**
   * Get the current TinyCloud session.
   * Available after signIn().
   */
  get session() {
    return this.auth?.tinyCloudSession;
  }
  /**
   * Get the currently active session in the shape callers can persist and later
   * pass back to {@link restoreSession}.
   */
  get restorableSession() {
    return this.currentTinyCloudSession();
  }
  /**
   * Sign in and create a new session.
   * This creates the user's space if it doesn't exist.
   * Requires wallet mode (privateKey in config).
   *
   * @param options - Optional per-call SIWE overrides for this sign-in only
   */
  async signIn(options) {
    if (!this.signer || !this.tc) {
      throw new Error(
        "Cannot signIn() in session-only mode. Provide a privateKey in config to create your own space."
      );
    }
    await this.wasmBindings.ensureInitialized?.();
    this._address = canonicalizeAddress2(await this.signer.getAddress());
    this._chainId = await this.signer.getChainId();
    this._kv = void 0;
    this._sql = void 0;
    this._duckdb = void 0;
    this._hooks = void 0;
    this._vault = void 0;
    this._encryption = void 0;
    this._baseSecrets.clear();
    this._secrets.clear();
    this._spaceService = void 0;
    this._serviceContext = void 0;
    this.runtimePermissionGrants = [];
    await this.tc.signIn(options);
    this.syncResolvedHostFromAuth();
    this.initializeServices();
    const primarySession = this.currentTinyCloudSession();
    if (primarySession) {
      this.registerPrimarySessionGrant(primarySession);
    }
    const bootstrapped = await this.bootstrapAccountIfNeeded();
    await this.ensureRequestedEncryptionNetworks();
    if (!bootstrapped && this.config.manifest === void 0 && this.config.capabilityRequest === void 0) {
      await this.ensureOwnedSpaceHostedById(this.ownedSpaceId(SECRETS_SPACE2));
    }
    if (!bootstrapped) {
      this.scheduleAccountRegistrySync();
    }
    this.notificationHandler.success("Successfully signed in");
  }
  ownedSpaceId(name) {
    if (!this._address) {
      throw new Error("Cannot resolve owned space before sign-in");
    }
    return this.wasmBindings.makeSpaceId(this._address, this._chainId, name);
  }
  async bootstrapAccountIfNeeded() {
    this._bootstrapSkipped = false;
    this._bootstrapStatus = { skipped: false };
    if (this.config.autoBootstrapAccount === false) {
      return false;
    }
    if (!this.auth || !this._address) {
      return false;
    }
    if (isInteractiveSigner(this.config)) {
      console.debug(
        "[TinyCloudNode] bootstrap skipped: interactive signer detected. Server-side bootstrap (OpenKey) is expected to have provisioned the account."
      );
      this._bootstrapSkipped = true;
      this._bootstrapStatus = { skipped: true, reason: "interactive-signer" };
      return false;
    }
    const steps = bootstrapSteps(this._address, this._chainId);
    if (!await this.isFreshBootstrapAccount(steps)) {
      return false;
    }
    try {
      await this.runAccountBootstrap(steps);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this._bootstrapSkipped = true;
      this._bootstrapStatus = { skipped: true, reason };
      this.notificationHandler.warning(
        `Account bootstrap did not complete: ${reason}`
      );
      console.warn(`[TinyCloudNode] account bootstrap failed: ${reason}`);
      return false;
    }
    return true;
  }
  async isFreshBootstrapAccount(steps) {
    const enshrinedSpaceIds = /* @__PURE__ */ new Set();
    for (const step of steps) {
      if (step.kind === "session") {
        enshrinedSpaceIds.add(step.spaceId);
      }
    }
    const skipped = this.auth.lastActivationSkippedSpaceIds;
    if (skipped.some((spaceId) => enshrinedSpaceIds.has(spaceId))) {
      return true;
    }
    try {
      const indexed = await this.account.index.spaces.list();
      if (indexed.ok && indexed.data.length === 0) {
        return true;
      }
    } catch {
    }
    try {
      const spaces = await this.account.spaces.list();
      return spaces.ok && spaces.data.length === 0;
    } catch {
      return false;
    }
  }
  async runAccountBootstrap(steps) {
    if (!this.auth || !this._address) {
      throw new Error("Account bootstrap requires an active wallet session");
    }
    const host = this.hosts[0] ?? this.config.host;
    if (!host) {
      throw new Error("Account bootstrap requires a TinyCloud host");
    }
    const auth = this.auth;
    const sessions = /* @__PURE__ */ new Map();
    const rawAbilitiesBySpace = /* @__PURE__ */ new Map();
    const primarySession = auth.tinyCloudSession;
    const defaultSpaceId = this.ownedSpaceId("default");
    const canReusePrimaryBootstrapSession = primarySession?.spaceId === defaultSpaceId && auth.capabilityRequest === BOOTSTRAP_SESSION_REQUESTS.default;
    for (const step of steps) {
      if (step.kind !== "session") continue;
      if (step.space === "default" && canReusePrimaryBootstrapSession && primarySession) {
        sessions.set(step.space, primarySession);
        continue;
      }
      const rawAbilities = step.rawAbilities;
      if (rawAbilities) {
        rawAbilitiesBySpace.set(step.space, rawAbilities);
      }
      let session;
      try {
        session = await auth.createBootstrapSession({
          spaceId: step.spaceId,
          capabilityRequest: step.request ?? BOOTSTRAP_SESSION_REQUESTS[step.space],
          rawAbilities
        });
      } catch (err) {
        throw new Error(
          `Account bootstrap aborted: signature rejected for space "${step.space}". Cause: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      sessions.set(step.space, session);
    }
    for (const step of steps) {
      if (step.kind !== "host") continue;
      const hosted = await auth.hostOwnedSpace(step.spaceId, "bootstrap-host");
      if (!hosted) {
        throw new Error(`Failed to host bootstrap space: ${step.spaceId}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    for (const step of steps) {
      if (step.kind !== "activate") continue;
      const session = sessions.get(step.space);
      if (!session) {
        throw new Error(`Missing bootstrap session for ${step.space}`);
      }
      const activated = await activateSessionWithHost2(host, session.delegationHeader);
      if (!activated.success || activated.skipped?.includes(step.spaceId)) {
        throw new Error(
          `Failed to activate bootstrap session for ${step.spaceId}: ${activated.error ?? "space was skipped"}`
        );
      }
      this.registerBootstrapRuntimeGrant(
        session,
        BOOTSTRAP_SESSION_REQUESTS[step.space],
        rawAbilitiesBySpace.get(step.space)
      );
    }
    for (const step of steps) {
      if (step.kind === "account-index-schema") {
        const ensured = await this.account.index.ensure();
        if (!ensured.ok) {
          throw new Error(`Failed to create account index schema: ${ensured.error.message}`);
        }
      }
      if (step.kind === "seed-spaces") {
        for (const space of step.spaces) {
          const registered = await this.account.spaces.register({
            spaceId: space.spaceId,
            name: space.name,
            ownerDid: this.did,
            type: "owned",
            permissions: ["*"],
            status: "active"
          });
          if (!registered.ok) {
            throw new Error(
              `Failed to seed account space ${space.spaceId}: ${registered.error.message}`
            );
          }
        }
      }
      if (step.kind === "seed-applications") {
        const registered = await this.account.applications.register(
          step.manifests.length > 0 ? [...step.manifests] : TINYCLOUD_SECRETS_BOOTSTRAP_MANIFEST
        );
        if (!registered.ok) {
          throw new Error(`Failed to seed bootstrap applications: ${registered.error.message}`);
        }
      }
      if (step.kind === "encryption-network-create") {
        await this.ensureEncryptionNetwork(step.networkId);
      }
      if (step.kind === "secret-records-schema") {
        const db = this.sqlForSpace(step.spaceId).db(step.database);
        const migrated = await db.migrations.apply({
          namespace: "tinycloud.secrets.records",
          migrations: [
            {
              id: "001_initial",
              sql: [...SECRET_RECORDS_SCHEMA]
            }
          ]
        });
        if (!migrated.ok) {
          throw new Error(
            `Failed to create secret_records schema: ${migrated.error.message}`
          );
        }
      }
    }
  }
  registerBootstrapRuntimeGrant(session, request, rawAbilities) {
    const operations = [];
    for (const resource of request.resources) {
      const service = resource.service.startsWith("tinycloud.") ? this.shortServiceName(resource.service) : resource.service;
      const spaceId = resource.space.startsWith("tinycloud:") ? resource.space : this.ownedSpaceId(resource.space);
      for (const action of resource.actions) {
        operations.push({
          spaceId,
          service,
          path: resource.path,
          action
        });
      }
    }
    for (const [resource, actions2] of Object.entries(rawAbilities ?? {})) {
      for (const action of actions2) {
        operations.push({
          resource,
          service: "encryption",
          path: resource,
          action
        });
      }
    }
    const expiresAt = extractSiweExpiration(session.siwe) ?? this.getSessionExpiry();
    const actions = [...new Set(operations.map((operation) => operation.action))];
    this.runtimePermissionGrants.push({
      session: {
        delegationHeader: session.delegationHeader,
        delegationCid: session.delegationCid,
        spaceId: session.spaceId,
        verificationMethod: session.verificationMethod,
        jwk: session.jwk
      },
      delegation: {
        cid: session.delegationCid,
        delegationHeader: session.delegationHeader,
        delegateDID: session.verificationMethod,
        delegatorDID: this.did,
        spaceId: session.spaceId,
        path: "",
        actions,
        expiry: expiresAt,
        allowSubDelegation: true,
        ownerAddress: session.address,
        chainId: session.chainId,
        host: this.config.host
      },
      operations,
      expiresAt,
      provenance: "bootstrap"
    });
  }
  /**
   * Map the base session's OWN recap into runtime permission operations.
   *
   * Uses the RAW `parseRecapFromSiwe` binding — NOT `parseRecapCapabilities`,
   * whose `normalizeSpace` collapses `tinycloud:pkh:...:<owner>:<space>` to a
   * bare short name and would conflate two owners' identically-named spaces.
   * We must keep the full owner-scoped URI so a synthetic primary grant can
   * never cover an operation on a different owner's space.
   *
   * Mirrors {@link operationsFromDelegation}'s op shape: encryption network
   * entries (`urn:tinycloud:encryption:` paths) become `resource` ops; every
   * other entry becomes a `spaceId` op carrying the raw recap `space` URI.
   * One op per action.
   *
   * Returns `[]` for session-only / restored-without-siwe modes and for any
   * unparseable SIWE — the primary grant is simply not registered in that case.
   */
  recapOperationsFromSession(session) {
    const siwe = session.siwe;
    if (!siwe) {
      return [];
    }
    if (this._recapOperationsCache?.siwe === siwe) {
      return this._recapOperationsCache.operations;
    }
    let operations = [];
    try {
      const entries = this.wasmBindings.parseRecapFromSiwe(siwe);
      if (Array.isArray(entries)) {
        operations = entries.flatMap((entry) => {
          const service = this.invocationServiceName(entry.service);
          return entry.actions.map((action) => ({
            ...this.isEncryptionNetworkOperation(service, entry.path) ? { resource: entry.path } : { spaceId: entry.space },
            service,
            path: entry.path,
            action
          }));
        });
      }
    } catch {
      operations = [];
    }
    this._recapOperationsCache = { siwe, operations };
    return operations;
  }
  /**
   * Register the base (primary) session's own recap as a synthetic runtime
   * grant tagged `provenance: "primary"` so it always out-ranks other covering
   * grants in {@link findGrantForOperations}. This closes the selection-design
   * hazard where a broad — possibly broken — bootstrap/delegated grant could
   * hijack an operation the primary session itself already authorized (TC-111).
   *
   * Two safety exclusions:
   *  - Ops whose space is in `lastActivationSkippedSpaceIds` are dropped: the
   *    node refused to activate those spaces this sign-in even though the recap
   *    claims them. Including them would let the synthetic primary out-rank a
   *    working grant and 401 (the "skipped-activation inverted hijack").
   *  - Encryption `resource` ops are kept as-is (space-independent).
   *
   * No-ops when nothing remains after exclusion. Callers (`signIn`,
   * `restoreSession`) clear `runtimePermissionGrants` first, so no dupes.
   */
  registerPrimarySessionGrant(session) {
    const skipped = this.auth ? this.auth.lastActivationSkippedSpaceIds ?? [] : [];
    const operations = this.recapOperationsFromSession(session).filter(
      (operation) => operation.spaceId === void 0 || !skipped.some((spaceId) => this.spaceIdsEqual(spaceId, operation.spaceId))
    );
    if (operations.length === 0) {
      return;
    }
    const expiresAt = extractSiweExpiration(session.siwe) ?? this.getSessionExpiry();
    const actions = [...new Set(operations.map((operation) => operation.action))];
    this.runtimePermissionGrants.push({
      session: {
        delegationHeader: session.delegationHeader,
        delegationCid: session.delegationCid,
        spaceId: session.spaceId,
        verificationMethod: session.verificationMethod,
        jwk: session.jwk
      },
      delegation: {
        cid: session.delegationCid,
        delegationHeader: session.delegationHeader,
        delegateDID: session.verificationMethod,
        delegatorDID: this.did,
        spaceId: session.spaceId,
        path: "",
        actions,
        expiry: expiresAt,
        allowSubDelegation: true,
        ownerAddress: session.address,
        chainId: session.chainId,
        host: this.config.host
      },
      operations,
      expiresAt,
      provenance: "primary"
    });
  }
  async writeManifestRegistryRecords() {
    const request = this.capabilityRequest;
    if (!request || request.registryRecords.length === 0) {
      return;
    }
    if (!this.auth || !this.signer) {
      throw new Error("Manifest registry write requires wallet mode");
    }
    const accountSpaceId = this.ownedSpaceId(ACCOUNT_REGISTRY_SPACE);
    await this.ensureOwnedSpaceHostedById(accountSpaceId);
    const result = await this.account.applications.register(request.manifests);
    if (!result.ok) {
      throw new Error(
        `Failed to write manifest registry records: ${result.error.message}`
      );
    }
  }
  scheduleAccountRegistrySync() {
    void this.withAccountRegistryRetry(async () => {
      void this.account.index.ensure();
      await this.writeManifestRegistryRecords();
      const spaces = await this.account.spaces.syncAccessible();
      if (!spaces.ok) {
        throw new Error(`Failed to sync account spaces: ${spaces.error.message}`);
      }
    });
  }
  async withAccountRegistryRetry(task) {
    const delays = [250, 1e3, 3e3];
    let lastError;
    for (let attempt = 0; attempt < delays.length; attempt += 1) {
      try {
        await task();
        return;
      } catch (error) {
        lastError = error;
        if (attempt < delays.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
        }
      }
    }
    console.warn(
      "TinyCloud account registry sync failed after retries",
      lastError
    );
  }
  requestedEncryptionNetworkIds() {
    const request = this.capabilityRequest;
    if (!request) {
      return [];
    }
    const networkIds = /* @__PURE__ */ new Set();
    for (const resource of request.resources) {
      if (resource.service === ENCRYPTION_PERMISSION_SERVICE2 && resource.path.startsWith("urn:tinycloud:encryption:") && resource.actions.includes(DECRYPT_ACTION2)) {
        networkIds.add(resource.path);
      }
    }
    return [...networkIds];
  }
  async ensureRequestedEncryptionNetworks() {
    if (!this.signer || !this.auth) {
      return;
    }
    for (const networkId of this.requestedEncryptionNetworkIds()) {
      const parsed = parseNetworkId2(networkId);
      if (!didPrincipalMatches2(parsed.ownerDid, this.did)) {
        continue;
      }
      await this.ensureEncryptionNetwork(networkId);
    }
  }
  async ensureOwnedSpaceHostedById(spaceId) {
    if (!this.auth) {
      throw new Error("Owned space hosting requires wallet mode");
    }
    const session = this.auth.tinyCloudSession;
    if (!session) {
      throw new Error("Owned space hosting requires an active session");
    }
    const host = this.hosts[0] ?? this.config.host;
    if (!host) {
      throw new Error("Owned space hosting requires a TinyCloud host");
    }
    const activation = await activateSessionWithHost2(host, session.delegationHeader);
    if (activation.success && !activation.skipped?.includes(spaceId)) {
      return;
    }
    if (!activation.success && activation.status !== 404) {
      throw new Error(
        `Failed to check owned space ${spaceId}: ${activation.error ?? activation.status}`
      );
    }
    const created = await this.auth.hostOwnedSpace(spaceId);
    if (!created) {
      throw new Error(`Failed to create owned space: ${spaceId}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    const retry = await activateSessionWithHost2(host, session.delegationHeader);
    if (!retry.success || retry.skipped?.includes(spaceId)) {
      throw new Error(
        `Failed to activate session after creating owned space ${spaceId}: ${retry.error ?? "space was skipped"}`
      );
    }
  }
  /**
   * Host one of this user's owned spaces by name (e.g. `"applications"`).
   *
   * Resolves the name to the owned space URI
   * (`tinycloud:pkh:eip155:<chain>:<addr>:<name>`) and registers it on the
   * server via the host-SIWE delegation flow, so subsequent KV/SQL writes to
   * that space succeed instead of returning `404 - Space not found`. The
   * caller is the root authority of their own owned spaces, so no additional
   * delegation is required.
   *
   * Unlike {@link ensureOwnedSpaceHostedById}, this always submits the host
   * delegation rather than inferring hosting from session activation: a space
   * the current session has never referenced is reported neither as
   * `activated` nor `skipped`, so activation-based detection would wrongly
   * skip the host. The host SIWE is idempotent server-side, so re-hosting an
   * existing space is a safe no-op. Must be called after {@link signIn}.
   *
   * @param name - The owned space name (e.g. `"applications"`).
   * @returns The hosted space URI.
   */
  async hostOwnedSpace(name) {
    if (!this.auth || !this.auth.tinyCloudSession) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const spaceId = this.ownedSpaceId(name);
    const host = this.hosts[0] ?? this.config.host;
    if (!host) {
      throw new Error("Owned space hosting requires a TinyCloud host");
    }
    const hosted = await this.auth.hostOwnedSpace(
      spaceId
    );
    if (!hosted) {
      throw new Error(`Failed to host owned space: ${spaceId}`);
    }
    const activation = await activateSessionWithHost2(
      host,
      this.auth.tinyCloudSession.delegationHeader
    );
    if (!activation.success || activation.skipped?.includes(spaceId)) {
      throw new Error(
        `Failed to activate session for owned space ${spaceId}: ${activation.error ?? "space was skipped"}`
      );
    }
    void this.account.spaces.register({
      spaceId,
      name,
      ownerDid: this.did,
      type: "owned",
      permissions: ["*"],
      status: "active"
    }).catch(() => {
    });
    return spaceId;
  }
  /**
   * Ensure one of this user's owned spaces (e.g. `"secrets"`) is hosted on the
   * server.
   *
   * At sign-in, a full-authority session auto-hosts the owner's `secrets`
   * space, but a session created with a manifest / capabilityRequest does not.
   * Such a session can therefore hold valid `tinycloud.kv/*` capabilities for
   * the owned `secrets` space yet still fail its first scoped
   * `secrets.put(...)` with `404 Space not found`, because the space was never
   * registered on the node.
   *
   * Calling this resolves `name` to the owner's owned-space URI
   * (`tinycloud:pkh:eip155:<chain>:<addr>:<name>`). It first consults the
   * account-space spaces registry (`account/spaces/{space_id}`, the canonical
   * KV source of truth, fronted by a best-effort SQLite index): if the space is
   * already registered/hosted it returns the URI WITHOUT submitting a host
   * delegation, avoiding a redundant host-SIWE signature prompt for owners who
   * already use the space. Only when the space is absent — or the registry
   * check fails for any reason (e.g. a cold SQLite index reporting
   * `no such table: spaces`) — does it fall through to {@link hostOwnedSpace}.
   *
   * The registry check is purely an optimization: any failure falls back to
   * hosting, and the host SIWE is idempotent server-side, so re-hosting an
   * existing space remains a safe no-op. Must be called after {@link signIn}.
   *
   * @param name - The owned space name (e.g. `"secrets"`).
   * @returns The hosted owned-space URI.
   */
  async ensureOwnedSpaceHosted(name) {
    if (!this.auth || !this.auth.tinyCloudSession) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const spaceId = this.ownedSpaceId(name);
    if (await this.isOwnedSpaceRegistered(spaceId)) {
      return spaceId;
    }
    const hosted = await this.hostOwnedSpace(name);
    try {
      await this.account.spaces.register({
        spaceId,
        name,
        ownerDid: this.did,
        type: "owned",
        permissions: ["*"],
        status: "active"
      });
    } catch {
    }
    return hosted;
  }
  /**
   * Check whether an owned space is already registered/hosted by consulting the
   * account spaces registry.
   *
   * Source of truth is the canonical KV registry record
   * `account/spaces/{space_id}`, read here via `account.spaces.get(spaceId)`.
   * The KV path is used (rather than `syncAccessible()`) because it works under
   * a manifest/recap session with NO extra prompt: the composed manifest recap
   * already grants `tinycloud.kv get/list` on the account space `spaces/`
   * prefix, whereas `syncAccessible()` depends on `tinycloud.space/list`, which
   * a recap session does not hold. Before reading, it consults the fast SQLite
   * index (`account.index.spaces.list()`) as a best-effort short-circuit; on a
   * cold index (`no such table: spaces`) or any other index failure it falls
   * back to the canonical KV read.
   *
   * This is a best-effort optimization. ANY failure of the check path (missing
   * table, KV error, missing record, thrown exception) resolves to `false` so
   * the caller falls through to hosting — per the directive, "if it fails in any
   * way then create the space".
   */
  async isOwnedSpaceRegistered(spaceId) {
    try {
      const indexed = await this.account.index.spaces.list();
      if (indexed.ok && indexed.data.some((space) => space.spaceId === spaceId)) {
        return true;
      }
    } catch {
    }
    try {
      const record = await this.account.spaces.get(spaceId);
      return record.ok;
    } catch {
      return false;
    }
  }
  /**
   * Restore a previously established session from stored delegation data.
   *
   * This is used by the CLI to restore a session that was created via the
   * browser-based delegation flow (OpenKey `/delegate` page). Instead of
   * signing in with a private key, it injects the delegation data directly.
   *
   * @param sessionData - The stored delegation data from the browser flow
   */
  async restoreSession(sessionData) {
    await this.wasmBindings.ensureInitialized?.();
    this._kv = void 0;
    this._sql = void 0;
    this._duckdb = void 0;
    this._hooks = void 0;
    this._vault = void 0;
    this._encryption = void 0;
    this._baseSecrets.clear();
    this._secrets.clear();
    this._spaceService = void 0;
    this._serviceContext = void 0;
    this.runtimePermissionGrants = [];
    const restoredAddress = sessionData.address ? canonicalizeAddress2(sessionData.address) : void 0;
    if (restoredAddress) {
      this._address = restoredAddress;
    }
    if (sessionData.chainId) {
      this._chainId = sessionData.chainId;
    }
    const resolvedHost = await this.resolveRestoredHost(
      sessionData.tinycloudHosts,
      restoredAddress,
      sessionData.chainId
    );
    if (resolvedHost) {
      this.config.host = resolvedHost;
    }
    this._serviceContext = new ServiceContext2({
      invoke: this.invokeWithRuntimePermissions,
      invokeAny: this.invokeAnyWithRuntimePermissions,
      fetch: globalThis.fetch.bind(globalThis),
      hosts: [this.config.host],
      telemetry: this.config.telemetry
    });
    this._kv = new KVService2({});
    this._kv.initialize(this._serviceContext);
    this._serviceContext.registerService("kv", this._kv);
    this._sql = new SQLService2({});
    this._sql.initialize(this._serviceContext);
    this._serviceContext.registerService("sql", this._sql);
    this._duckdb = new DuckDbService2({});
    this._duckdb.initialize(this._serviceContext);
    this._serviceContext.registerService("duckdb", this._duckdb);
    this._hooks = new HooksService2({});
    this._hooks.initialize(this._serviceContext);
    this._serviceContext.registerService("hooks", this._hooks);
    const serviceSession = {
      delegationHeader: sessionData.delegationHeader,
      delegationCid: sessionData.delegationCid,
      spaceId: sessionData.spaceId,
      verificationMethod: sessionData.verificationMethod,
      jwk: sessionData.jwk
    };
    this._serviceContext.setSession(serviceSession);
    this._vault = this.createVaultService(sessionData.spaceId, this._kv);
    this._vault.initialize(this._serviceContext);
    this._serviceContext.registerService("vault", this._vault);
    this.initializeV2Services(serviceSession);
    if (sessionData.siwe && restoredAddress && sessionData.chainId) {
      const tcSession = {
        address: restoredAddress,
        chainId: sessionData.chainId,
        sessionKey: JSON.stringify(sessionData.jwk),
        spaceId: sessionData.spaceId,
        delegationCid: sessionData.delegationCid,
        delegationHeader: sessionData.delegationHeader,
        verificationMethod: sessionData.verificationMethod,
        jwk: sessionData.jwk,
        siwe: sessionData.siwe,
        signature: sessionData.signature ?? ""
      };
      if (this.auth) {
        this.auth.setRestoredTinyCloudSession(
          tcSession,
          this.config.host ? [this.config.host] : void 0
        );
      } else {
        this._restoredTcSession = tcSession;
      }
      this.registerPrimarySessionGrant(tcSession);
    }
  }
  /**
   * Resolve the host a restored session should target.
   *
   * Mirrors fresh sign-in host resolution but for the restore path:
   * an explicit/pinned host always wins, then the hosts the session was
   * persisted with, then a lazy registry/fallback resolution for sessions
   * that predate the persisted `tinycloudHosts` field. Returns `undefined`
   * only when there's nothing to resolve from (no explicit host, no
   * persisted hosts, and no address/chainId) — in which case the existing
   * `config.host` (default) is left in place.
   *
   * Resolution failures are surfaced, not swallowed: a genuinely broken
   * registry lookup throws rather than silently falling back to a wrong host.
   */
  async resolveRestoredHost(persistedHosts, address, chainId) {
    if (this.explicitHost) {
      return this.explicitHost;
    }
    if (persistedHosts && persistedHosts.length > 0) {
      return persistedHosts[0];
    }
    if (address === void 0 || chainId === void 0) {
      return void 0;
    }
    const resolved = await resolveTinyCloudHosts2(pkhDid2(address, chainId), {
      registryUrl: this.config.tinycloudRegistryUrl,
      fallbackHosts: this.config.tinycloudFallbackHosts
    });
    return resolved.hosts[0];
  }
  /**
   * Resolve the currently-active TinyCloudSession, preferring the auth
   * layer's value (wallet mode) and falling back to the node-level
   * rehydration set by {@link restoreSession} (session-only mode).
   */
  currentTinyCloudSession() {
    return this.auth?.tinyCloudSession ?? this._restoredTcSession;
  }
  /**
   * Connect a wallet to upgrade from session-only mode to wallet mode.
   *
   * This allows a user who started in session-only mode to later connect
   * a wallet and gain the ability to create their own space.
   *
   * Note: This does NOT automatically sign in. Call signIn() after connecting
   * the wallet to create your space.
   *
   * @param privateKey - The Ethereum private key (hex string, no 0x prefix)
   * @param options - Optional configuration
   * @param options.prefix - Space name prefix (defaults to "default")
   *
   * @example
   * ```typescript
   * // Start in session-only mode
   * const node = new TinyCloudNode({ host: "https://node.tinycloud.xyz" });
   * console.log(node.did); // did:key:z6Mk... (session key)
   *
   * // Later, connect a wallet
   * node.connectWallet(privateKey);
   * await node.signIn();
   * console.log(node.did); // did:pkh:eip155:1:0x... (PKH)
   * ```
   */
  connectWallet(privateKey, options) {
    if (this.signer) {
      throw new Error("Wallet already connected. Cannot connect another wallet.");
    }
    const prefix = options?.prefix ?? "default";
    if (!_TinyCloudNode.nodeDefaults) {
      throw new Error(
        "connectWallet() requires PrivateKeySigner. Use connectSigner() instead, or import from '@tinycloud/node-sdk' (not '/core') for automatic Node.js defaults."
      );
    }
    this.signer = _TinyCloudNode.nodeDefaults.createSigner(privateKey);
    const authConfig = { ...this.config, prefix };
    const useBootstrapSignInRequest = this.shouldUseBootstrapSignInRequest(authConfig);
    this.auth = new NodeUserAuthorization({
      signer: this.signer,
      signStrategy: this.config.signStrategy ?? { type: "auto-sign" },
      wasmBindings: this.wasmBindings,
      sessionStorage: options?.sessionStorage ?? this.config.sessionStorage ?? new MemorySessionStorage(),
      domain: this.siweDomain,
      spacePrefix: prefix,
      sessionExpirationMs: this.config.sessionExpirationMs ?? DEFAULT_SESSION_EXPIRATION_MS,
      tinycloudHosts: this.explicitHost ? [this.explicitHost] : void 0,
      tinycloudRegistryUrl: this.config.tinycloudRegistryUrl,
      tinycloudFallbackHosts: this.config.tinycloudFallbackHosts,
      autoCreateSpace: useBootstrapSignInRequest ? false : this.config.autoCreateSpace,
      enablePublicSpace: this.config.enablePublicSpace ?? true,
      spaceCreationHandler: useBootstrapSignInRequest ? void 0 : this.config.spaceCreationHandler,
      nonce: this.config.nonce,
      siweConfig: this.config.siweConfig,
      manifest: useBootstrapSignInRequest ? void 0 : this.config.manifest,
      capabilityRequest: useBootstrapSignInRequest ? BOOTSTRAP_SESSION_REQUESTS.default : this.config.capabilityRequest,
      includeAccountRegistryPermissions: useBootstrapSignInRequest ? false : this.config.includeAccountRegistryPermissions
    });
    this.tc = new TinyCloud(this.auth, {
      invokeAny: this.invokeAnyWithRuntimePermissions,
      telemetry: this.config.telemetry
    });
    this.config.prefix = prefix;
  }
  /**
   * Connect any ISigner to upgrade from session-only mode to wallet mode.
   *
   * Same as connectWallet() but accepts any ISigner implementation instead
   * of a raw private key string. Use this for browser wallets, hardware wallets,
   * or custom signing backends.
   *
   * Note: This does NOT automatically sign in. Call signIn() after connecting.
   *
   * @param signer - Any ISigner implementation
   * @param options - Optional configuration
   * @param options.prefix - Space name prefix (defaults to "default")
   */
  connectSigner(signer, options) {
    if (this.signer) {
      throw new Error("Signer already connected. Cannot connect another signer.");
    }
    const prefix = options?.prefix ?? "default";
    this.signer = signer;
    const authConfig = { ...this.config, prefix };
    const useBootstrapSignInRequest = this.shouldUseBootstrapSignInRequest(authConfig);
    this.auth = new NodeUserAuthorization({
      signer: this.signer,
      signStrategy: this.config.signStrategy ?? { type: "auto-sign" },
      wasmBindings: this.wasmBindings,
      sessionStorage: options?.sessionStorage ?? this.config.sessionStorage ?? new MemorySessionStorage(),
      domain: this.siweDomain,
      spacePrefix: prefix,
      sessionExpirationMs: this.config.sessionExpirationMs ?? DEFAULT_SESSION_EXPIRATION_MS,
      tinycloudHosts: this.explicitHost ? [this.explicitHost] : void 0,
      tinycloudRegistryUrl: this.config.tinycloudRegistryUrl,
      tinycloudFallbackHosts: this.config.tinycloudFallbackHosts,
      autoCreateSpace: useBootstrapSignInRequest ? false : this.config.autoCreateSpace,
      enablePublicSpace: this.config.enablePublicSpace ?? true,
      spaceCreationHandler: useBootstrapSignInRequest ? void 0 : this.config.spaceCreationHandler,
      nonce: this.config.nonce,
      siweConfig: this.config.siweConfig,
      manifest: useBootstrapSignInRequest ? void 0 : this.config.manifest,
      capabilityRequest: useBootstrapSignInRequest ? BOOTSTRAP_SESSION_REQUESTS.default : this.config.capabilityRequest,
      includeAccountRegistryPermissions: useBootstrapSignInRequest ? false : this.config.includeAccountRegistryPermissions
    });
    this.tc = new TinyCloud(this.auth, {
      invokeAny: this.invokeAnyWithRuntimePermissions,
      telemetry: this.config.telemetry
    });
    this.config.prefix = prefix;
  }
  /**
   * Initialize the service context and KV service after sign-in.
   * @internal
   */
  initializeServices() {
    const session = this.currentTinyCloudSession();
    if (!session) {
      return;
    }
    this.tc.initializeServices(this.invokeWithRuntimePermissions, [this.config.host]);
    this._serviceContext = new ServiceContext2({
      invoke: this.invokeWithRuntimePermissions,
      invokeAny: this.invokeAnyWithRuntimePermissions,
      fetch: globalThis.fetch.bind(globalThis),
      hosts: [this.config.host],
      telemetry: this.config.telemetry
    });
    this._kv = new KVService2({});
    this._kv.initialize(this._serviceContext);
    this._serviceContext.registerService("kv", this._kv);
    const features = this.nodeFeatures;
    if (features.length === 0 || features.includes("sql")) {
      this._sql = new SQLService2({});
      this._sql.initialize(this._serviceContext);
      this._serviceContext.registerService("sql", this._sql);
    }
    if (features.length === 0 || features.includes("duckdb")) {
      this._duckdb = new DuckDbService2({});
      this._duckdb.initialize(this._serviceContext);
      this._serviceContext.registerService("duckdb", this._duckdb);
    }
    this._hooks = new HooksService2({});
    this._hooks.initialize(this._serviceContext);
    this._serviceContext.registerService("hooks", this._hooks);
    const serviceSession = {
      delegationHeader: session.delegationHeader,
      delegationCid: session.delegationCid,
      spaceId: session.spaceId,
      verificationMethod: session.verificationMethod,
      jwk: session.jwk
    };
    this._serviceContext.setSession(serviceSession);
    this.tc.serviceContext.setSession(serviceSession);
    this._vault = this.createVaultService(session.spaceId, this._kv);
    this._vault.initialize(this._serviceContext);
    this._serviceContext.registerService("vault", this._vault);
    this.initializeV2Services(serviceSession);
  }
  createSpaceScopedKVService(spaceId) {
    const kvService = new KVService2({});
    if (this._serviceContext) {
      const spaceScopedContext = new ServiceContext2({
        invoke: this._serviceContext.invoke,
        fetch: this._serviceContext.fetch,
        hosts: this._serviceContext.hosts,
        telemetry: this.config.telemetry
      });
      const session = this._serviceContext.session;
      if (session) {
        spaceScopedContext.setSession({ ...session, spaceId });
      }
      kvService.initialize(spaceScopedContext);
    }
    return kvService;
  }
  getDefaultEncryptionNetworkId(name = DEFAULT_ENCRYPTION_NETWORK_NAME) {
    return `urn:tinycloud:encryption:${this.did}:${name}`;
  }
  getEncryptionNetworkIdForSpace(spaceId, name = DEFAULT_ENCRYPTION_NETWORK_NAME) {
    const ownerDid = this.ownerDidFromSpaceId(spaceId) ?? this.did;
    return `urn:tinycloud:encryption:${ownerDid}:${name}`;
  }
  ownerDidFromSpaceId(spaceId) {
    if (!spaceId.startsWith("tinycloud:")) return void 0;
    const body = spaceId.slice("tinycloud:".length);
    const lastSeparator = body.lastIndexOf(":");
    if (lastSeparator <= 0) return void 0;
    const owner = body.slice(0, lastSeparator);
    if (owner.startsWith("did:")) return owner;
    if (!owner.includes(":")) return void 0;
    return `did:${owner}`;
  }
  requireServiceSession() {
    const session = this._serviceContext?.session;
    if (!session) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    return session;
  }
  createEncryptionCrypto() {
    const wasm = this.wasmBindings;
    const columnEncrypt = (key2, plaintext) => {
      const encrypted = wasm.vault_encrypt(key2, plaintext);
      const out = new Uint8Array(1 + encrypted.length);
      out[0] = 1;
      out.set(encrypted, 1);
      return out;
    };
    const columnDecrypt = (key2, blob) => {
      if (blob[0] !== 1) {
        return blob;
      }
      return wasm.vault_decrypt(key2, blob.slice(1));
    };
    return {
      sha256: (data) => wasm.vault_sha256(data),
      randomBytes: (length) => wasm.vault_random_bytes(length),
      x25519FromSeed: (seed) => wasm.vault_x25519_from_seed(seed),
      x25519Dh: (privateKey, publicKey) => wasm.vault_x25519_dh(privateKey, publicKey),
      authEncrypt: (key2, plaintext) => wasm.vault_encrypt(key2, plaintext),
      authDecrypt: (key2, ciphertext) => wasm.vault_decrypt(key2, ciphertext),
      sealToNetworkKey: (networkPublicKey, symmetricKey) => {
        const seed = wasm.vault_random_bytes(32);
        const ephemeral = wasm.vault_x25519_from_seed(seed);
        const shared = wasm.vault_x25519_dh(
          ephemeral.privateKey,
          networkPublicKey
        );
        const encrypted = columnEncrypt(shared, symmetricKey);
        const out = new Uint8Array(ephemeral.publicKey.length + encrypted.length);
        out.set(ephemeral.publicKey, 0);
        out.set(encrypted, ephemeral.publicKey.length);
        return out;
      },
      openWithReceiverKey: (receiverPrivateKey, wrappedKey) => {
        const peerPublic = wrappedKey.slice(0, 32);
        const ciphertext = wrappedKey.slice(32);
        const shared = wasm.vault_x25519_dh(receiverPrivateKey, peerPublic);
        return columnDecrypt(shared, ciphertext);
      },
      verifyNodeSignature: (nodeId, message, signature2) => verifyDidKeyEd25519Signature(nodeId, message, signature2)
    };
  }
  async fetchNodeId() {
    const response = await fetch(`${this.config.host}/info`);
    if (!response.ok) {
      throw new Error(`Failed to fetch node info: HTTP ${response.status}`);
    }
    const info = await response.json();
    if (typeof info.nodeId !== "string" || info.nodeId.length === 0) {
      throw new Error("Node /info response did not include nodeId");
    }
    return info.nodeId;
  }
  async signRawNetworkAuthorization(input) {
    if (!this.wasmBindings.invokeAny) {
      throw new Error("WASM binding does not support raw-resource invokeAny");
    }
    if (!this.wasmBindings.computeCid) {
      throw new Error("WASM binding does not support invocation CID computation");
    }
    const session = this.requireServiceSession();
    const headers = this.invokeAnyWithRuntimePermissions(
      session,
      [
        {
          resource: input.networkId,
          service: "encryption",
          path: input.networkId,
          action: input.action
        }
      ],
      [input.facts]
    );
    const authorization = authorizationHeader(headers);
    const audienceBound = await rewriteInvocationAudience(
      authorization,
      input.targetNode,
      session.jwk
    );
    return {
      authorization: audienceBound,
      invocationCid: this.wasmBindings.computeCid(
        new TextEncoder().encode(audienceBound),
        0x55n
      )
    };
  }
  createEncryptionService() {
    const crypto2 = this.createEncryptionCrypto();
    const transport = {
      postDecrypt: async ({ networkId, authorization, canonicalBody }) => {
        const response = await fetch(
          `${this.config.host}/encryption/networks/${encodeURIComponent(networkId)}/decrypt`,
          {
            method: "POST",
            headers: {
              Authorization: authorization,
              "Content-Type": "application/json"
            },
            body: canonicalBody
          }
        );
        if (!response.ok) {
          throw new Error(
            `decrypt failed ${response.status}: ${await response.text()}`
          );
        }
        return await response.json();
      }
    };
    return new EncryptionService({
      crypto: crypto2,
      signer: {
        signDecryptInvocation: async (input) => {
          const signed2 = await this.signRawNetworkAuthorization({
            targetNode: input.targetNode,
            networkId: input.networkId,
            action: DECRYPT_ACTION2,
            facts: input.facts
          });
          return {
            ...signed2,
            canonicalBody: canonicalizeEncryptionJson(
              input.body
            )
          };
        }
      },
      transport,
      node: {
        fetchByNetworkId: (networkId) => this.getEncryptionNetwork(networkId)
      },
      wellKnown: {
        fetchWellKnown: async (principal, discoveryKey) => {
          if (!this._address || !didPrincipalMatches2(principal, this.did)) {
            return null;
          }
          if (!this.config.host) {
            return null;
          }
          const publicSpaceId = makePublicSpaceId(this._address, this._chainId);
          const result = await TinyCloud.readPublicSpace(this.config.host, publicSpaceId, discoveryKey);
          if (!result.ok) {
            return null;
          }
          const body = result.data;
          return "descriptor" in body && body.descriptor ? body.descriptor : body;
        }
      }
    });
  }
  getEncryptionService() {
    if (!this._serviceContext) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    if (!this._encryption) {
      this._encryption = this.createEncryptionService();
      this._encryption.initialize(this._serviceContext);
      this._serviceContext.registerService("encryption", this._encryption);
    }
    return this._encryption;
  }
  createVaultService(spaceId, kv) {
    const wasm = this.wasmBindings;
    const vaultCrypto = createVaultCrypto({
      vault_encrypt: wasm.vault_encrypt,
      vault_decrypt: wasm.vault_decrypt,
      vault_derive_key: wasm.vault_derive_key,
      vault_x25519_from_seed: wasm.vault_x25519_from_seed,
      vault_x25519_dh: wasm.vault_x25519_dh,
      vault_random_bytes: wasm.vault_random_bytes,
      vault_sha256: wasm.vault_sha256
    });
    const self2 = this;
    return new DataVaultService({
      spaceId,
      crypto: vaultCrypto,
      encryption: {
        networkId: this.getEncryptionNetworkIdForSpace(spaceId),
        service: this.getEncryptionService(),
        decryptCapabilityProof: () => ({
          proofs: [this.requireServiceSession().delegationCid]
        })
      },
      tc: {
        kv,
        ensurePublicSpace: async () => {
          try {
            await self2.ensurePublicSpace();
            return { ok: true, data: void 0 };
          } catch (error) {
            return { ok: false, error: { code: "STORAGE_ERROR", message: error instanceof Error ? error.message : String(error), service: "vault" } };
          }
        },
        get publicKV() {
          return self2._publicKV ?? self2.tc.publicKV;
        },
        readPublicSpace: (host, targetSpaceId, key2) => TinyCloud.readPublicSpace(host, targetSpaceId, key2),
        makePublicSpaceId: TinyCloud.makePublicSpaceId,
        did: this.did,
        address: this._address ?? "",
        chainId: this._chainId,
        hosts: [this.config.host]
      }
    });
  }
  /**
   * Initialize the v2 delegation system services.
   * @internal
   */
  initializeV2Services(serviceSession) {
    this._capabilityRegistry = new CapabilityKeyRegistry();
    const tcSession = this.auth?.tinyCloudSession;
    if (tcSession && this._address) {
      const sessionKey = {
        id: tcSession.sessionKey,
        did: tcSession.verificationMethod,
        type: "session",
        // Cast jwk from generic object to JWK - we know it has the required structure
        jwk: tcSession.jwk,
        priority: 0
        // Session keys have highest priority
      };
      const rootDelegation = {
        cid: tcSession.delegationCid,
        delegateDID: tcSession.verificationMethod,
        spaceId: tcSession.spaceId,
        path: "",
        // Root access
        actions: [...ROOT_DELEGATION_ACTIONS],
        expiry: this.getSessionExpiry(),
        isRevoked: false,
        allowSubDelegation: true
      };
      const delegations = [rootDelegation];
      if (tcSession.spaces) {
        for (const [spaceName, spaceId] of Object.entries(tcSession.spaces)) {
          delegations.push({
            cid: tcSession.delegationCid,
            delegateDID: tcSession.verificationMethod,
            spaceId,
            path: "",
            actions: [...ROOT_DELEGATION_ACTIONS],
            expiry: this.getSessionExpiry(),
            isRevoked: false,
            allowSubDelegation: true
          });
        }
      }
      this._capabilityRegistry.registerKey(sessionKey, delegations);
    }
    this._delegationManager = new DelegationManager({
      hosts: [this.config.host],
      session: serviceSession,
      invoke: this.invokeWithRuntimePermissions,
      fetch: globalThis.fetch.bind(globalThis)
    });
    this._spaceService = new SpaceService({
      hosts: [this.config.host],
      session: serviceSession,
      invoke: this.wasmBindings.invoke,
      fetch: globalThis.fetch.bind(globalThis),
      capabilityRegistry: this._capabilityRegistry,
      userDid: this.did,
      createKVService: (spaceId) => {
        return this.createSpaceScopedKVService(spaceId);
      },
      createVaultService: (spaceId) => {
        const kvService = this.createSpaceScopedKVService(spaceId);
        const vaultService = this.createVaultService(spaceId, kvService);
        if (this._serviceContext) {
          vaultService.initialize(this._serviceContext);
        }
        return vaultService;
      },
      createSecretsService: (spaceId) => {
        return this.secretsForSpace(spaceId);
      },
      // Enable space.delegations.create() via SIWE-based delegation
      createDelegation: async (params) => {
        try {
          const portableDelegation = await this.createDelegation({
            delegateDID: params.delegateDID,
            path: params.path,
            actions: params.actions,
            disableSubDelegation: params.disableSubDelegation,
            expiryMs: params.expiry ? params.expiry.getTime() - Date.now() : void 0
          });
          const delegation = {
            cid: portableDelegation.cid,
            delegateDID: portableDelegation.delegateDID,
            delegatorDID: this.did,
            spaceId: portableDelegation.spaceId,
            path: portableDelegation.path,
            actions: portableDelegation.actions,
            expiry: portableDelegation.expiry,
            isRevoked: false,
            allowSubDelegation: !portableDelegation.disableSubDelegation,
            createdAt: /* @__PURE__ */ new Date(),
            authHeader: portableDelegation.delegationHeader.Authorization
          };
          return { ok: true, data: delegation };
        } catch (error) {
          return {
            ok: false,
            error: {
              code: "CREATION_FAILED",
              message: error instanceof Error ? error.message : String(error),
              service: "delegation"
            }
          };
        }
      },
      onSpaceRegistered: async (space) => {
        await this.account.spaces.register(space);
      }
    });
    this._sharingService.updateConfig({
      session: serviceSession,
      delegationManager: this._delegationManager,
      sessionExpiry: this.getSessionExpiry(),
      // WASM-based delegation creation (preferred - no server roundtrip)
      createDelegationWasm: (params) => this.createDelegationWrapper(params),
      // Root delegation for long-lived share links (bypasses session expiry)
      // In node-sdk we have direct signer access, so no popup needed
      onRootDelegationNeeded: this.signer ? async (params) => this.createRootDelegationForSharing(params) : void 0
    });
    this._spaceService.updateConfig({
      sharingService: this._sharingService
    });
  }
  /**
   * Get the session expiry time.
   * @internal
   */
  getSessionExpiry() {
    const expirationMs = this.config.sessionExpirationMs ?? DEFAULT_SESSION_EXPIRATION_MS;
    return new Date(Date.now() + expirationMs);
  }
  /**
   * Wrapper for the WASM createDelegation function.
   *
   * The WASM call now takes a multi-resource `abilities` map
   * (matching `prepareSession`'s shape) and emits ONE UCAN that
   * covers every `(service, path, actions)` entry. We mirror the raw
   * result back through `CreateDelegationWasmResult`, converting the
   * seconds-since-epoch `expiry` to a Date and normalizing the
   * `delegateDid` → `delegateDID` case.
   *
   * Both SharingService (single-entry) and
   * {@link TinyCloudNode.delegateTo} (multi-entry) drive this through
   * the same code path so there's exactly one place that touches the
   * WASM boundary.
   *
   * @internal
   */
  createDelegationWrapper(params) {
    const wasmSession = {
      delegationHeader: params.session.delegationHeader,
      delegationCid: params.session.delegationCid,
      jwk: params.session.jwk,
      spaceId: params.session.spaceId,
      verificationMethod: params.session.verificationMethod
    };
    const result = this.wasmBindings.createDelegation(
      wasmSession,
      params.delegateDID,
      params.spaceId,
      params.abilities,
      params.expirationSecs,
      params.notBeforeSecs
    );
    return {
      delegation: result.delegation,
      cid: result.cid,
      // Rust serde `rename_all = "camelCase"` emits `delegateDid`
      // (lowercase d); the TypeScript interface uses `delegateDID`
      // (historical, matches Delegation.delegateDID). Normalize here.
      delegateDID: result.delegateDid ?? result.delegateDID,
      expiry: new Date(result.expiry * 1e3),
      resources: result.resources
    };
  }
  /**
   * Create a direct root delegation from the wallet to a share key.
   * This bypasses the session delegation chain, allowing share links
   * with expiry longer than the current session.
   * @internal
   */
  async createOwnerDelegation(params) {
    if (!params.delegateDid.startsWith("did:key:") || params.actions.length === 0 || params.path.length === 0) {
      throw new Error("Owner delegation requires an external did:key audience and bounded capabilities");
    }
    const now = /* @__PURE__ */ new Date();
    if (params.expiresAt.getTime() <= now.getTime() || params.expiresAt.getTime() - now.getTime() > EXPIRY3.MAX_MS) {
      throw new Error("Owner delegation expiry must be explicit, future, and within EXPIRY.MAX_MS");
    }
    if (!this.signer) throw new Error("Owner wallet signer is required");
    const session = this.currentTinyCloudSession();
    if (!session) throw new Error("Owner session is required");
    const abilities = sharingActionsToAbilities(params.path, [...params.actions]);
    if (!abilities) throw new Error("Owner delegation capabilities are unsupported");
    const host = this.config.host;
    const prepared = this.wasmBindings.prepareSession({
      abilities,
      address: this.wasmBindings.ensureEip55(session.address),
      chainId: session.chainId,
      domain: this.siweDomain,
      issuedAt: now.toISOString(),
      expirationTime: params.expiresAt.toISOString(),
      spaceId: params.spaceId,
      delegateUri: params.delegateDid
    });
    const signature2 = await this.signer.signMessage(prepared.siwe);
    const delegationSession = this.wasmBindings.completeSessionSetup({ ...prepared, signature: signature2 });
    const activation = await activateSessionWithHost2(host, delegationSession.delegationHeader);
    if (!activation.success) {
      throw new Error(`Owner delegation import failed: ${activation.status} ${activation.error ?? ""}`.trim());
    }
    const delegation = {
      cid: delegationSession.delegationCid,
      delegateDID: params.delegateDid,
      delegatorDID: pkhDid2(session.address, session.chainId),
      spaceId: params.spaceId,
      path: params.path,
      actions: [...params.actions],
      expiry: params.expiresAt,
      isRevoked: false,
      allowSubDelegation: true,
      createdAt: now,
      authHeader: delegationSession.delegationHeader.Authorization
    };
    return {
      delegation,
      signedDagCbor: decodeAuthorizationBytes(delegationSession.delegationHeader.Authorization),
      delegationCid: delegationSession.delegationCid,
      nodeReceipt: {
        commitEventCid: activation.commitEventCid,
        activated: activation.activated ?? [],
        skipped: activation.skipped ?? []
      }
    };
  }
  async createRootDelegationForSharing(params) {
    try {
      return (await this.createOwnerDelegation({
        delegateDid: params.shareKeyDID,
        spaceId: params.spaceId,
        path: params.path,
        actions: params.actions,
        expiresAt: params.requestedExpiry
      })).delegation;
    } catch {
      return void 0;
    }
  }
  /**
   * Track a received delegation in the capability registry.
   * @internal
   */
  trackReceivedDelegation(delegation, jwk) {
    if (!this._capabilityRegistry) {
      return;
    }
    const keyInfo = {
      id: `received:${delegation.cid}`,
      did: this.sessionDid,
      type: "ingested",
      jwk,
      priority: 2
    };
    const delegationRecord = {
      cid: delegation.cid,
      delegateDID: delegation.delegateDID,
      spaceId: delegation.spaceId,
      path: delegation.path,
      actions: delegation.actions,
      expiry: delegation.expiry,
      isRevoked: false,
      allowSubDelegation: !delegation.disableSubDelegation
    };
    this._capabilityRegistry.ingestKey(keyInfo, delegationRecord);
  }
  /**
   * Key-value storage operations on this user's space.
   */
  get kv() {
    if (!this._kv) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this._kv;
  }
  /**
   * SQL database operations on this user's space.
   */
  get sql() {
    if (!this._sql) {
      const features = this.nodeFeatures;
      if (features.length > 0 && !features.includes("sql")) {
        throw new UnsupportedFeatureError("sql", this.config.host, features);
      }
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this._sql;
  }
  /**
   * Get an SQL service scoped to a specific space.
   *
   * Mirrors {@link SpaceService}'s per-space KV factory: clones the active
   * service context and overrides its session's spaceId so that subsequent
   * `sql/<dbName>/<action>` invocations route to that space. Useful when
   * the caller already holds a delegation covering the target space (e.g.
   * via {@link grantRuntimePermissions} or {@link useRuntimeDelegation})
   * but the SDK's per-space SQL surface isn't otherwise exposed.
   *
   * Does NOT auto-create the space.
   *
   * @param spaceId - Full space URI (`tinycloud:pkh:eip155:<chain>:<addr>:<name>`).
   */
  sqlForSpace(spaceId) {
    if (!this._serviceContext || !this._serviceContext.session) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const sql = new SQLService2({});
    const spaceScopedContext = new ServiceContext2({
      invoke: this._serviceContext.invoke,
      fetch: this._serviceContext.fetch,
      hosts: this._serviceContext.hosts,
      telemetry: this.config.telemetry
    });
    spaceScopedContext.setSession({ ...this._serviceContext.session, spaceId });
    sql.initialize(spaceScopedContext);
    return sql;
  }
  /**
   * Get a KV service scoped to a specific space.
   *
   * The KV counterpart to {@link sqlForSpace}: clones the active service
   * context and overrides its session's spaceId so that subsequent
   * `kv/<action>` invocations route to that space. Useful for reading data
   * that a manifest app stores outside the primary space (e.g. transcripts a
   * `defaults: true` app keeps under the owner's `applications` space), when
   * the caller already holds a delegation covering the target space.
   *
   * Does NOT auto-create the space.
   *
   * @param spaceId - Full space URI (`tinycloud:pkh:eip155:<chain>:<addr>:<name>`).
   */
  kvForSpace(spaceId) {
    if (!this._serviceContext || !this._serviceContext.session) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const kv = new KVService2({});
    const spaceScopedContext = new ServiceContext2({
      invoke: this._serviceContext.invoke,
      fetch: this._serviceContext.fetch,
      hosts: this._serviceContext.hosts
    });
    spaceScopedContext.setSession({ ...this._serviceContext.session, spaceId });
    kv.initialize(spaceScopedContext);
    return kv;
  }
  /**
   * DuckDB database operations on this user's space.
   */
  get duckdb() {
    if (!this._duckdb) {
      const features = this.nodeFeatures;
      if (features.length > 0 && !features.includes("duckdb")) {
        throw new UnsupportedFeatureError("duckdb", this.config.host, features);
      }
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this._duckdb;
  }
  /**
   * Data Vault operations - client-side encrypted KV storage.
   * Call `vault.unlock(signer)` after signIn() to derive encryption keys.
   */
  get vault() {
    if (!this._vault) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this._vault;
  }
  /**
   * Network-scoped encryption/decrypt service.
   */
  get encryption() {
    return this.getEncryptionService();
  }
  async getEncryptionNetwork(nameOrNetworkId = this.getDefaultEncryptionNetworkId()) {
    const networkId = nameOrNetworkId.startsWith("urn:tinycloud:encryption:") ? nameOrNetworkId : this.getDefaultEncryptionNetworkId(nameOrNetworkId);
    const response = await fetch(
      `${this.config.host}/encryption/networks/${encodeURIComponent(networkId)}`
    );
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(
        `Failed to fetch encryption network ${networkId}: HTTP ${response.status} ${await response.text()}`
      );
    }
    const body = await response.json();
    return "descriptor" in body && body.descriptor ? body.descriptor : body;
  }
  async createEncryptionNetwork(name = DEFAULT_ENCRYPTION_NETWORK_NAME) {
    const targetNode = await this.fetchNodeId();
    const ownerDid = this.did;
    const networkId = this.getDefaultEncryptionNetworkId(name);
    const body = {
      name,
      ownerDid,
      threshold: { n: 1, t: 1 }
    };
    const crypto2 = this.createEncryptionCrypto();
    const facts = {
      type: NETWORK_ADMIN_TYPE,
      targetNode,
      networkId,
      bodyHash: canonicalHashHex(
        crypto2.sha256,
        body
      ),
      action: NETWORK_CREATE_ACTION2
    };
    const signed2 = await this.signRawNetworkAuthorization({
      targetNode,
      networkId,
      action: NETWORK_CREATE_ACTION2,
      facts
    });
    const response = await fetch(`${this.config.host}/encryption/networks`, {
      method: "POST",
      headers: {
        Authorization: signed2.authorization,
        "Content-Type": "application/json"
      },
      body: canonicalizeEncryptionJson(
        body
      )
    });
    if (!response.ok) {
      throw new Error(
        `Failed to create encryption network ${networkId}: HTTP ${response.status} ${await response.text()}`
      );
    }
    const created = await response.json();
    return created.descriptor;
  }
  async ensureEncryptionNetwork(nameOrNetworkId = DEFAULT_ENCRYPTION_NETWORK_NAME) {
    const networkId = nameOrNetworkId.startsWith("urn:tinycloud:encryption:") ? nameOrNetworkId : this.getDefaultEncryptionNetworkId(nameOrNetworkId);
    const existing = await this.getEncryptionNetwork(networkId);
    if (existing) {
      return existing;
    }
    const parsed = parseNetworkId2(networkId);
    if (!didPrincipalMatches2(parsed.ownerDid, this.did)) {
      throw new Error(
        `Cannot create encryption network ${networkId}: owner ${parsed.ownerDid} does not match signed-in DID ${this.did}`
      );
    }
    return this.createEncryptionNetwork(parsed.name);
  }
  /**
   * App-facing secrets API backed by the `secrets` space vault.
   */
  get secrets() {
    if (!this._spaceService) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this.secretsForSpace("secrets");
  }
  /**
   * App-facing secrets API backed by the requested space's vault.
   */
  secretsForSpace(spaceId) {
    if (!this._spaceService) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const resolvedSpace = spaceId.startsWith("tinycloud:") ? spaceId : this.ownedSpaceId(spaceId);
    let secrets = this._secrets.get(resolvedSpace);
    if (!secrets) {
      secrets = new NodeSecretsService({
        getService: () => this.getBaseSecrets(resolvedSpace),
        space: resolvedSpace,
        getManifest: () => this.manifest,
        hasPermissions: (permissions) => this.hasRuntimePermissions(permissions),
        grantPermissions: (additional) => this.grantRuntimePermissions(additional),
        canEscalate: () => this.signer !== void 0 && this.tc !== void 0,
        getEncryptionNetworkId: () => this.getEncryptionNetworkIdForSpace(resolvedSpace),
        resolveSpace: (space) => space.startsWith("tinycloud:") ? space : this.ownedSpaceId(space),
        getUnlockSigner: () => this.signer ?? void 0
      });
      this._secrets.set(resolvedSpace, secrets);
    }
    return secrets;
  }
  getBaseSecrets(spaceId) {
    if (!this._spaceService) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const resolvedSpace = spaceId.startsWith("tinycloud:") ? spaceId : this.ownedSpaceId(spaceId);
    let secrets = this._baseSecrets.get(resolvedSpace);
    if (!secrets) {
      const kvService = this.createSpaceScopedKVService(resolvedSpace);
      const vaultService = this.createVaultService(resolvedSpace, kvService);
      if (this._serviceContext) {
        vaultService.initialize(this._serviceContext);
      }
      secrets = new SecretsService(() => vaultService);
      this._baseSecrets.set(resolvedSpace, secrets);
    }
    return secrets;
  }
  /**
   * Hooks write stream subscription API.
   */
  get hooks() {
    if (!this._hooks) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this._hooks;
  }
  // ===========================================================================
  // v2 Service Accessors
  // ===========================================================================
  /**
   * Get the CapabilityKeyRegistry for managing keys and their capabilities.
   *
   * The registry tracks keys (session, main, ingested) and their associated
   * delegations, enabling automatic key selection for operations.
   *
   * @example
   * ```typescript
   * const registry = alice.capabilityRegistry;
   *
   * // Get the best key for an operation
   * const key = registry.getKeyForCapability(
   *   "tinycloud://my-space/kv/data",
   *   "tinycloud.kv/get"
   * );
   *
   * // List all capabilities
   * const capabilities = registry.getAllCapabilities();
   * ```
   */
  get capabilityRegistry() {
    if (!this._capabilityRegistry) {
      throw new Error("CapabilityKeyRegistry not initialized.");
    }
    return this._capabilityRegistry;
  }
  /**
   * Access received delegations (recipient view).
   *
   * Use this to see what delegations have been received via useDelegation().
   *
   * @example
   * ```typescript
   * // List all received delegations
   * const received = bob.delegations.list();
   * console.log("I have access to:", received.length, "spaces");
   *
   * // Get a specific delegation by CID
   * const delegation = bob.delegations.get(cid);
   * ```
   */
  get delegations() {
    const registry = this._capabilityRegistry;
    if (!registry) {
      return {
        list: () => [],
        get: () => void 0
      };
    }
    return {
      list: () => registry.getAllCapabilities().map((entry) => entry.delegation),
      get: (cid) => {
        const capabilities = registry.getAllCapabilities();
        const entry = capabilities.find((e) => e.delegation.cid === cid);
        return entry?.delegation;
      }
    };
  }
  /**
   * Check whether the current session or an approved runtime delegation covers
   * every requested permission.
   */
  hasRuntimePermissions(permissions) {
    const session = this.currentTinyCloudSession();
    if (!session || !Array.isArray(permissions) || permissions.length === 0) {
      return false;
    }
    const expanded = this.expandPermissionEntries(permissions);
    if (this.sessionCoversPermissionEntries(session, expanded)) {
      return true;
    }
    return this.findRuntimeGrantsForPermissionEntries(expanded, session).length > 0;
  }
  /**
   * Return installed runtime permission delegations. When `permissions` is
   * provided, only delegations currently covering those permissions are
   * returned. Base-session manifest permissions are not represented here.
   */
  getRuntimePermissionDelegations(permissions) {
    this.pruneExpiredRuntimePermissionGrants();
    if (permissions === void 0) {
      return this.runtimePermissionGrants.filter((grant) => grant.provenance !== "primary").map((grant) => grant.delegation);
    }
    const session = this.currentTinyCloudSession();
    if (!session || !Array.isArray(permissions) || permissions.length === 0) {
      return [];
    }
    const expanded = this.expandPermissionEntries(permissions);
    return this.findRuntimeGrantsForPermissionEntries(expanded, session).map(
      (grant) => grant.delegation
    );
  }
  /**
   * Install a portable runtime permission delegation into this SDK instance so
   * matching service calls and downstream `delegateTo()` calls can use it.
   */
  async useRuntimeDelegation(delegation) {
    const session = this.currentTinyCloudSession();
    if (!session) {
      throw new SessionExpiredError(/* @__PURE__ */ new Date(0));
    }
    if (delegation.expiry.getTime() <= Date.now()) {
      throw new SessionExpiredError(delegation.expiry);
    }
    const expectedDids = [session.verificationMethod, this.sessionDid];
    if (!expectedDids.some((did) => didPrincipalMatches2(delegation.delegateDID, did))) {
      throw new Error(
        `Runtime delegation targets ${delegation.delegateDID} but this session key is ${session.verificationMethod}.`
      );
    }
    const targetHost = delegation.host ?? this.config.host;
    const activateResult = await activateSessionWithHost2(
      targetHost,
      delegation.delegationHeader
    );
    if (!activateResult.success) {
      throw new Error(
        `Failed to activate runtime permission delegation: ${activateResult.error}`
      );
    }
    this.runtimePermissionGrants = this.runtimePermissionGrants.filter(
      (grant) => grant.delegation.cid !== delegation.cid
    );
    this.runtimePermissionGrants.push(
      this.runtimeGrantFromDelegation(delegation, session)
    );
  }
  /**
   * Store additional permissions as narrow delegations to the current session
   * key. Future service invocations automatically use a stored delegation when
   * its `(space, service, path, action)` covers the request.
   */
  async grantRuntimePermissions(permissions, options) {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      throw new Error("grantRuntimePermissions requires a non-empty permissions array");
    }
    const session = this.currentTinyCloudSession();
    if (!session) {
      throw new SessionExpiredError(/* @__PURE__ */ new Date(0));
    }
    const sessionExpiry = extractSiweExpiration(session.siwe);
    if (sessionExpiry !== void 0) {
      const marginMs = _TinyCloudNode.SESSION_EXPIRY_SAFETY_MARGIN_MS;
      if (sessionExpiry.getTime() <= Date.now() + marginMs) {
        throw new SessionExpiredError(sessionExpiry);
      }
    }
    const expanded = this.expandPermissionEntries(permissions);
    if (this.sessionCoversPermissionEntries(session, expanded)) {
      return [];
    }
    const existingGrants = this.findRuntimeGrantsForPermissionEntries(expanded, session);
    if (existingGrants.length > 0) {
      return existingGrants.map((grant) => grant.delegation);
    }
    if (!this.signer) {
      throw new Error(
        "grantRuntimePermissions requires wallet mode with a signer or privateKey."
      );
    }
    const rawEntries = expanded.filter(
      (entry) => this.isEncryptionPermissionEntry(entry)
    );
    const spaceEntries = expanded.filter(
      (entry) => !this.isEncryptionPermissionEntry(entry)
    );
    const bySpace = /* @__PURE__ */ new Map();
    for (const entry of spaceEntries) {
      const spaceId = this.resolvePermissionSpace(entry.space, session);
      const current = bySpace.get(spaceId) ?? [];
      current.push(entry);
      bySpace.set(spaceId, current);
    }
    if (bySpace.size === 0 && rawEntries.length > 0) {
      bySpace.set(session.spaceId, []);
    }
    const now = /* @__PURE__ */ new Date();
    const requestedExpiryMs = resolveExpiryMs(options?.expiry);
    let expiresAt = new Date(now.getTime() + requestedExpiryMs);
    if (sessionExpiry !== void 0 && sessionExpiry < expiresAt) {
      expiresAt = sessionExpiry;
    }
    const delegations = [];
    let rawEntriesAttached = false;
    for (const [spaceId, entries] of bySpace) {
      const rawForDelegation = !rawEntriesAttached ? rawEntries : [];
      if (rawForDelegation.length > 0) {
        rawEntriesAttached = true;
      }
      const delegatedEntries = [...entries, ...rawForDelegation];
      const abilities = this.permissionsToAbilities(entries);
      const prepared = this.wasmBindings.prepareSession({
        abilities,
        ...rawForDelegation.length > 0 ? { rawAbilities: this.permissionsToRawAbilities(rawForDelegation) } : {},
        address: this.wasmBindings.ensureEip55(session.address),
        chainId: session.chainId,
        domain: this.siweDomain,
        issuedAt: now.toISOString(),
        expirationTime: expiresAt.toISOString(),
        spaceId,
        jwk: session.jwk
      });
      const signature2 = await this.signer.signMessage(prepared.siwe);
      const delegatedSession = this.wasmBindings.completeSessionSetup({
        ...prepared,
        signature: signature2
      });
      const activateResult = await activateSessionWithHost2(
        this.config.host,
        delegatedSession.delegationHeader
      );
      if (!activateResult.success) {
        throw new Error(
          `Failed to activate runtime permission delegation: ${activateResult.error}`
        );
      }
      const delegation = this.runtimeDelegationFromSession(
        delegatedSession,
        delegatedEntries,
        spaceId,
        session,
        expiresAt
      );
      this.runtimePermissionGrants.push({
        session: {
          delegationHeader: delegatedSession.delegationHeader,
          delegationCid: delegatedSession.delegationCid,
          spaceId,
          verificationMethod: session.verificationMethod,
          jwk: session.jwk
        },
        delegation,
        operations: this.permissionOperations(delegatedEntries, spaceId),
        expiresAt,
        provenance: "runtime"
      });
      delegations.push(delegation);
    }
    return delegations;
  }
  /**
   * Get the DelegationManager for delegation CRUD operations.
   *
   * This is the v2 delegation service providing a cleaner API than
   * the legacy createDelegation/useDelegation methods.
   *
   * @example
   * ```typescript
   * const delegations = alice.delegationManager;
   *
   * // Create a delegation
   * const result = await delegations.create({
   *   delegateDID: bob.did,
   *   path: "shared/",
   *   actions: ["tinycloud.kv/get", "tinycloud.kv/put"],
   *   expiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
   * });
   *
   * // List delegations
   * const listResult = await delegations.list();
   *
   * // Revoke a delegation
   * await delegations.revoke(delegationCid);
   * ```
   */
  get delegationManager() {
    if (!this._delegationManager) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this._delegationManager;
  }
  /**
   * Get the SpaceService for managing spaces.
   *
   * The SpaceService provides access to owned and delegated spaces,
   * including space creation, listing, and scoped operations.
   *
   * @example
   * ```typescript
   * const spaces = alice.spaces;
   *
   * // List all accessible spaces
   * const result = await spaces.list();
   *
   * // Create a new space
   * const createResult = await spaces.create('photos');
   *
   * // Get a space object for operations
   * const mySpace = spaces.get('default');
   * await mySpace.kv.put('key', 'value');
   *
   * // Check if a space exists
   * const exists = await spaces.exists('photos');
   * ```
   */
  get spaces() {
    if (!this._spaceService) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this._spaceService;
  }
  /**
   * Alias for `spaces` - get the SpaceService.
   * @see spaces
   */
  get spaceService() {
    return this.spaces;
  }
  /**
   * Get a Space object by short name or full URI.
   */
  space(nameOrUri) {
    return this.spaces.get(nameOrUri);
  }
  /**
   * Get the SharingService for creating and receiving v2 sharing links.
   *
   * The SharingService creates sharing links with embedded private keys,
   * allowing recipients to exercise delegations without prior session setup.
   *
   * @example
   * ```typescript
   * const sharing = alice.sharing;
   *
   * // Generate a sharing link
   * const result = await sharing.generate({
   *   path: "/kv/documents/report.pdf",
   *   actions: ["tinycloud.kv/get"],
   *   expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
   * });
   *
   * if (result.ok) {
   *   console.log("Share URL:", result.data.url);
   *   // Send the URL to the recipient
   * }
   *
   * // Receive a sharing link
   * const receiveResult = await sharing.receive(shareUrl);
   * if (receiveResult.ok) {
   *   // Use the pre-configured KV service
   *   const data = await receiveResult.data.kv.get("report.pdf");
   * }
   * ```
   */
  get sharing() {
    return this._sharingService;
  }
  /**
   * Alias for `sharing` - get the SharingService.
   * @see sharing
   */
  get sharingService() {
    return this.sharing;
  }
  // ===========================================================================
  // Public Space Methods
  // ===========================================================================
  /**
   * Ensure the user's public space exists and is accessible.
   * Creates the space and activates a session delegation for it.
   * This is the trigger for lazy public space creation — call it
   * before writing to spaces.get('public').kv.
   */
  async ensurePublicSpace() {
    if (!this.auth || !this.session || !this.signer) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const publicSpaceId = this.session.spaces?.public;
    if (!publicSpaceId) {
      throw new Error("Public space not enabled. Set enablePublicSpace: true in config.");
    }
    await this.auth.hostPublicSpace(publicSpaceId);
    const kvActions = [KV2.PUT, KV2.GET, KV2.DEL, KV2.LIST, KV2.METADATA];
    const abilities = { kv: { "": kvActions } };
    const now = /* @__PURE__ */ new Date();
    const expiryMs = EXPIRY3.EPHEMERAL_MS;
    const expirationTime = new Date(now.getTime() + expiryMs);
    const prepared = this.wasmBindings.prepareSession({
      abilities,
      address: this.wasmBindings.ensureEip55(this.session.address),
      chainId: this.session.chainId,
      domain: this.siweDomain,
      issuedAt: now.toISOString(),
      expirationTime: expirationTime.toISOString(),
      spaceId: publicSpaceId,
      jwk: this.session.jwk,
      parents: [this.session.delegationCid]
    });
    const signature2 = await this.signer.signMessage(prepared.siwe);
    const delegationSession = this.wasmBindings.completeSessionSetup({
      ...prepared,
      signature: signature2
    });
    const activateResult = await activateSessionWithHost2(
      this.config.host,
      delegationSession.delegationHeader
    );
    if (!activateResult.success) {
      throw new Error(`Failed to activate public space delegation: ${activateResult.error}`);
    }
    if (this._capabilityRegistry && this.session) {
      const sessionKey = {
        id: this.session.sessionKey,
        did: this.session.verificationMethod,
        type: "session",
        jwk: this.session.jwk,
        priority: 0
      };
      this._capabilityRegistry.registerKey(sessionKey, [{
        cid: delegationSession.delegationCid,
        delegateDID: this.session.verificationMethod,
        spaceId: publicSpaceId,
        path: "",
        actions: kvActions,
        expiry: expirationTime,
        isRevoked: false,
        allowSubDelegation: true
      }]);
    }
    if (this._serviceContext) {
      const publicKV = new KVService2({ prefix: "" });
      const publicContext = new ServiceContext2({
        invoke: this.invokeWithRuntimePermissions,
        fetch: this._serviceContext.fetch,
        hosts: this._serviceContext.hosts,
        telemetry: this.config.telemetry
      });
      publicContext.setSession({
        delegationHeader: delegationSession.delegationHeader,
        delegationCid: delegationSession.delegationCid,
        spaceId: publicSpaceId,
        verificationMethod: this.session.verificationMethod,
        jwk: this.session.jwk
      });
      publicKV.initialize(publicContext);
      this._publicKV = publicKV;
    }
  }
  /**
   * Get a KVService scoped to the user's own public space.
   * Writes require authentication (owner/delegate).
   */
  get publicKV() {
    if (this._publicKV) {
      return this._publicKV;
    }
    if (!this.tc) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    return this.tc.publicKV;
  }
  // ===========================================================================
  // v2 Delegation Convenience Methods
  // ===========================================================================
  /**
   * Create a delegation using the v2 DelegationManager.
   *
   * This is a convenience method that wraps DelegationManager.create().
   * For more control, use `this.delegationManager` directly.
   *
   * @param params - Delegation parameters
   * @returns Result containing the created Delegation
   *
   * @example
   * ```typescript
   * const result = await alice.delegate({
   *   delegateDID: bob.did,
   *   path: "shared/",
   *   actions: ["tinycloud.kv/get", "tinycloud.kv/put"],
   *   expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
   * });
   *
   * if (result.ok) {
   *   console.log("Delegation created:", result.data.cid);
   * }
   * ```
   */
  async delegate(params) {
    return this.delegationManager.create(params);
  }
  /**
   * Revoke a delegation using the v2 DelegationManager.
   *
   * @param cid - The CID of the delegation to revoke
   * @returns Result indicating success or failure
   */
  async revokeDelegation(cid) {
    return this.delegationManager.revoke(cid);
  }
  /**
   * List all delegations for the current session's space.
   *
   * @returns Result containing an array of Delegations
   */
  async listDelegations() {
    return this.delegationManager.list();
  }
  /**
   * Check if the current session has permission for a path and action.
   *
   * @param path - The resource path to check
   * @param action - The action to check (e.g., "tinycloud.kv/get")
   * @returns Result containing boolean permission status
   */
  async checkPermission(path, action) {
    return this.delegationManager.checkPermission(path, action);
  }
  /**
   * Issue a delegation using the capability-chain flow.
   *
   * When every requested permission is a subset of the current
   * session's recap, or of one installed runtime permission delegation,
   * the delegation is signed by the session key via WASM — no wallet
   * prompt. When at least one is NOT derivable, a
   * {@link PermissionNotInManifestError} is raised (carrying the
   * missing entries) so the caller can trigger an escalation flow
   * (e.g. `TinyCloudWeb.requestPermissions`). Passing
   * `forceWalletSign: true` bypasses the derivability check and
   * always uses the wallet-signed SIWE path — used by the legacy
   * `createDelegation` fallback and by callers that want explicit
   * wallet confirmation.
   *
   * Multi-entry delegations are now emitted as **one** signed UCAN:
   * the underlying WASM `createDelegation` takes a full
   * `HashMap<Service, HashMap<Path, Vec<Ability>>>` abilities map
   * and produces a single attenuation carrying every
   * `(service, path, actions)` entry. The returned
   * {@link DelegateToResult.delegation} is that single blob, and
   * apps can POST it to their backend exactly like a single-entry
   * delegation (the server verifies all granted resources from one
   * UCAN).
   *
   * For single-entry requests the `PortableDelegation.path` and
   * `.actions` fields mirror the one granted entry. For
   * multi-entry requests they mirror the **first** entry (stable
   * lexicographic order from the Rust side); consumers that need
   * the full picture read `PortableDelegation.resources`.
   *
   * @throws {@link SessionExpiredError} when there is no session or
   *   the current session has expired (or will within the 60s
   *   safety margin).
   * @throws {@link PermissionNotInManifestError} when any requested
   *   entry is not a subset of the granted session capabilities and
   *   `forceWalletSign` is not set.
   */
  async delegateTo(did, permissions, options) {
    const session = this.currentTinyCloudSession();
    if (!session) {
      throw new SessionExpiredError(/* @__PURE__ */ new Date(0));
    }
    const sessionExpiry = extractSiweExpiration(session.siwe);
    if (sessionExpiry !== void 0) {
      const now2 = Date.now();
      const marginMs = _TinyCloudNode.SESSION_EXPIRY_SAFETY_MARGIN_MS;
      if (sessionExpiry.getTime() <= now2 + marginMs) {
        throw new SessionExpiredError(sessionExpiry);
      }
    }
    if (!Array.isArray(permissions) || permissions.length === 0) {
      throw new Error(
        "delegateTo requires a non-empty permissions array"
      );
    }
    const expandedEntries = this.expandPermissionEntries(permissions);
    const now = /* @__PURE__ */ new Date();
    const expiryMs = resolveExpiryMs(options?.expiry);
    const expirationTime = new Date(now.getTime() + expiryMs);
    let effectiveExpiration = expirationTime;
    if (sessionExpiry !== void 0 && sessionExpiry < expirationTime) {
      effectiveExpiration = sessionExpiry;
    }
    if (options?.forceWalletSign) {
      if (expandedEntries.length > 1) {
        throw new Error(
          "delegateTo with forceWalletSign=true supports at most one PermissionEntry. Multi-entry requests must go through the session-key UCAN path (drop forceWalletSign) or the legacy createDelegation method."
        );
      }
      const delegation2 = await this.createDelegationLegacyWalletPath(
        did,
        expandedEntries[0],
        effectiveExpiration
      );
      return { delegation: delegation2, prompted: true };
    }
    const granted = parseRecapCapabilities(
      (siwe) => this.wasmBindings.parseRecapFromSiwe(siwe),
      session.siwe
    );
    const { subset, missing } = isCapabilitySubset(expandedEntries, granted);
    if (!subset) {
      const runtimeGrant = this.findGrantForOperations(
        this.permissionEntriesToOperations(expandedEntries, session)
      );
      if (runtimeGrant) {
        const marginMs = _TinyCloudNode.SESSION_EXPIRY_SAFETY_MARGIN_MS;
        if (runtimeGrant.expiresAt.getTime() <= Date.now() + marginMs) {
          throw new SessionExpiredError(runtimeGrant.expiresAt);
        }
        const runtimeExpiration = runtimeGrant.expiresAt < effectiveExpiration ? runtimeGrant.expiresAt : effectiveExpiration;
        const delegation2 = await this.createDelegationViaRuntimeGrant(
          did,
          expandedEntries,
          runtimeExpiration,
          runtimeGrant
        );
        return { delegation: delegation2, prompted: false };
      }
      throw new PermissionNotInManifestError(missing, granted);
    }
    const delegation = await this.createDelegationViaWasmPath(
      did,
      expandedEntries,
      effectiveExpiration,
      session
    );
    return { delegation, prompted: false };
  }
  /**
   * Materialize one manifest-declared delegation using the current session key.
   * Delivery is intentionally out of band; callers decide how to transmit the
   * returned UCAN to the delegate.
   */
  async materializeDelegation(did, request = this.capabilityRequest) {
    if (!request) {
      throw new Error(
        "materializeDelegation requires a composed manifest request"
      );
    }
    const target = request.delegationTargets.find(
      (entry) => didPrincipalMatches2(entry.did, did)
    );
    if (!target) {
      throw new Error(`No manifest delegation target found for DID ${did}`);
    }
    const result = await this.delegateTo(target.did, target.permissions, {
      expiry: target.expiryMs
    });
    return { ...result, target };
  }
  /**
   * Materialize every delegation target declared by the composed manifest
   * request. This does not deliver the delegations anywhere.
   */
  async materializeDelegations(request = this.capabilityRequest) {
    if (!request) {
      throw new Error(
        "materializeDelegations requires a composed manifest request"
      );
    }
    const out = [];
    for (const target of request.delegationTargets) {
      out.push(await this.materializeDelegation(target.did, request));
    }
    return out;
  }
  /**
   * Issue a delegation via the session-key UCAN WASM path.
   *
   * The caller has already verified every entry is derivable from
   * the current session; we build one multi-resource abilities map
   * and emit one signed UCAN covering them all.
   *
   * Non-encryption entries must share the same target space. Encryption
   * entries are raw network URNs and do not participate in space grouping.
   *
   * @internal
   */
  async createDelegationViaWasmPath(did, entries, expirationTime, session) {
    if (entries.length === 0) {
      throw new Error(
        "createDelegationViaWasmPath requires a non-empty entries array"
      );
    }
    const resolvedSpaces = /* @__PURE__ */ new Set();
    for (const entry of entries) {
      if (this.isEncryptionPermissionEntry(entry)) {
        continue;
      }
      const spaceId2 = this.resolvePermissionSpace(entry.space, session);
      resolvedSpaces.add(spaceId2);
    }
    if (resolvedSpaces.size > 1) {
      throw new Error(
        `delegateTo: all permission entries must target the same space, got ${resolvedSpaces.size}: ${JSON.stringify([...resolvedSpaces])}`
      );
    }
    const spaceId = resolvedSpaces.size === 1 ? [...resolvedSpaces][0] : session.spaceId;
    const abilities = {};
    for (const entry of entries) {
      const shortService = SERVICE_LONG_TO_SHORT[entry.service];
      if (shortService === void 0) {
        throw new Error(
          `delegateTo: unknown service '${entry.service}' \u2014 no short-form mapping`
        );
      }
      if (abilities[shortService] === void 0) {
        abilities[shortService] = {};
      }
      const pathsMap = abilities[shortService];
      const existing = pathsMap[entry.path];
      if (existing === void 0) {
        pathsMap[entry.path] = [...entry.actions];
      } else {
        const seen = new Set(existing);
        for (const action of entry.actions) {
          if (!seen.has(action)) {
            existing.push(action);
            seen.add(action);
          }
        }
      }
    }
    const serviceSession = {
      delegationHeader: session.delegationHeader,
      delegationCid: session.delegationCid,
      jwk: session.jwk,
      spaceId,
      verificationMethod: session.verificationMethod
    };
    const expirationSecs = Math.floor(expirationTime.getTime() / 1e3);
    const result = this.createDelegationWrapper({
      session: serviceSession,
      delegateDID: did,
      spaceId,
      abilities,
      expirationSecs
    });
    const primary = result.resources[0];
    const delegationHeader = { Authorization: result.delegation };
    const activateResult = await activateSessionWithHost2(
      this.config.host,
      delegationHeader
    );
    if (!activateResult.success) {
      throw new Error(
        `Failed to activate delegation with host: ${activateResult.error}`
      );
    }
    return {
      cid: result.cid,
      delegationHeader,
      spaceId,
      path: primary.path,
      actions: primary.actions,
      resources: result.resources,
      disableSubDelegation: false,
      expiry: result.expiry,
      delegateDID: did,
      ownerAddress: session.address,
      chainId: session.chainId,
      host: this.config.host
    };
  }
  async createDelegationViaRuntimeGrant(did, entries, expirationTime, grant) {
    const result = this.createDelegationWrapper({
      session: grant.session,
      delegateDID: did,
      spaceId: grant.session.spaceId,
      abilities: this.permissionsToAbilities(entries),
      expirationSecs: Math.floor(expirationTime.getTime() / 1e3)
    });
    const primary = result.resources[0];
    const delegationHeader = { Authorization: result.delegation };
    const targetHost = grant.delegation.host ?? this.config.host;
    const activateResult = await activateSessionWithHost2(
      targetHost,
      delegationHeader
    );
    if (!activateResult.success) {
      throw new Error(
        `Failed to activate delegation with host: ${activateResult.error}`
      );
    }
    return {
      cid: result.cid,
      delegationHeader,
      spaceId: grant.session.spaceId,
      path: primary.path,
      actions: primary.actions,
      resources: result.resources,
      disableSubDelegation: false,
      expiry: result.expiry,
      delegateDID: did,
      ownerAddress: grant.delegation.ownerAddress,
      chainId: grant.delegation.chainId,
      host: targetHost
    };
  }
  resolvePermissionSpace(space, session) {
    if (space === void 0) {
      return this.wasmBindings.makeSpaceId(
        session.address,
        session.chainId,
        "applications"
      );
    }
    if (space === "default") {
      return session.spaceId;
    }
    if (space.startsWith("tinycloud:")) {
      return space;
    }
    return this.wasmBindings.makeSpaceId(session.address, session.chainId, space);
  }
  expandPermissionEntries(permissions) {
    return expandPermissionEntriesCore(permissions);
  }
  shortServiceName(service) {
    const short = SERVICE_LONG_TO_SHORT[service];
    if (short === void 0) {
      throw new Error(
        `unknown service '${service}' \u2014 no short-form mapping`
      );
    }
    return short;
  }
  permissionsToAbilities(entries) {
    const abilities = {};
    for (const entry of entries) {
      const service = this.shortServiceName(entry.service);
      abilities[service] ?? (abilities[service] = {});
      const existing = abilities[service][entry.path] ?? [];
      const seen = new Set(existing);
      for (const action of entry.actions) {
        if (!seen.has(action)) {
          existing.push(action);
          seen.add(action);
        }
      }
      abilities[service][entry.path] = existing;
    }
    return abilities;
  }
  isEncryptionPermissionEntry(entry) {
    return entry.service === ENCRYPTION_PERMISSION_SERVICE2 && entry.path.startsWith("urn:tinycloud:encryption:");
  }
  permissionsToRawAbilities(entries) {
    const rawAbilities = {};
    for (const entry of entries) {
      if (!this.isEncryptionPermissionEntry(entry)) {
        continue;
      }
      const existing = rawAbilities[entry.path] ?? [];
      const seen = new Set(existing);
      for (const action of entry.actions) {
        if (!seen.has(action)) {
          existing.push(action);
          seen.add(action);
        }
      }
      rawAbilities[entry.path] = existing;
    }
    return rawAbilities;
  }
  permissionOperations(entries, spaceId) {
    return entries.flatMap((entry) => {
      const service = this.shortServiceName(entry.service);
      return entry.actions.map((action) => ({
        ...this.isEncryptionNetworkOperation(service, entry.path) ? { resource: entry.path } : { spaceId },
        service,
        path: entry.path,
        action
      }));
    });
  }
  sessionCoversPermissionEntries(session, entries) {
    try {
      const granted = parseRecapCapabilities(
        (siwe) => this.wasmBindings.parseRecapFromSiwe(siwe),
        session.siwe
      );
      return isCapabilitySubset(entries, granted).subset;
    } catch {
      return false;
    }
  }
  permissionEntriesToOperations(entries, session) {
    return entries.flatMap((entry) => {
      const spaceId = this.resolvePermissionSpace(entry.space, session);
      const service = this.shortServiceName(entry.service);
      return entry.actions.map((action) => ({
        ...this.isEncryptionNetworkOperation(service, entry.path) ? { resource: entry.path } : { spaceId },
        service,
        path: entry.path,
        action
      }));
    });
  }
  findRuntimeGrantsForPermissionEntries(entries, session) {
    const grants = [];
    const operations = this.permissionEntriesToOperations(entries, session);
    if (operations.length === 0) {
      return grants;
    }
    for (const operation of operations) {
      const grant = this.findGrantForOperation(operation, { excludePrimary: true });
      if (!grant) {
        return [];
      }
      if (!grants.includes(grant)) {
        grants.push(grant);
      }
    }
    return grants;
  }
  runtimeDelegationFromSession(delegatedSession, entries, spaceId, session, expiresAt) {
    const resources = this.delegatedResourcesForEntries(entries, spaceId);
    const primary = resources[0];
    return {
      cid: delegatedSession.delegationCid,
      delegationHeader: delegatedSession.delegationHeader,
      spaceId,
      path: primary.path,
      actions: primary.actions,
      resources,
      disableSubDelegation: false,
      expiry: expiresAt,
      delegateDID: session.verificationMethod,
      ownerAddress: session.address,
      chainId: session.chainId,
      host: this.config.host
    };
  }
  runtimeGrantFromDelegation(delegation, session) {
    const operations = this.operationsFromDelegation(delegation);
    return {
      session: {
        delegationHeader: delegation.delegationHeader,
        delegationCid: delegation.cid,
        spaceId: delegation.spaceId,
        verificationMethod: session.verificationMethod,
        jwk: session.jwk
      },
      delegation,
      operations,
      expiresAt: delegation.expiry,
      provenance: "delegated"
    };
  }
  installRuntimeGrantFromServiceSession(delegation, session, expiresAt) {
    const operations = this.operationsFromDelegation(delegation);
    if (operations.length === 0) {
      return;
    }
    this.runtimePermissionGrants = this.runtimePermissionGrants.filter(
      (grant) => grant.delegation.cid !== delegation.cid && grant.session.delegationCid !== session.delegationCid
    );
    this.runtimePermissionGrants.push({
      session,
      delegation,
      operations,
      expiresAt,
      provenance: "delegated"
    });
  }
  delegatedResourcesForEntries(entries, spaceId) {
    return entries.map((entry) => ({
      service: this.shortServiceName(entry.service),
      space: this.isEncryptionPermissionEntry(entry) ? "encryption" : spaceId,
      path: entry.path,
      actions: [...entry.actions]
    }));
  }
  operationsFromDelegation(delegation) {
    const resources = delegation.resources !== void 0 && delegation.resources.length > 0 ? delegation.resources : this.flatDelegationResources(delegation);
    return resources.flatMap((resource) => {
      const service = this.invocationServiceName(resource.service);
      return resource.actions.map((action) => ({
        ...this.isEncryptionNetworkOperation(service, resource.path) ? { resource: resource.path } : { spaceId: resource.space },
        service,
        path: resource.path,
        action
      }));
    });
  }
  flatDelegationResources(delegation) {
    const byService = /* @__PURE__ */ new Map();
    for (const action of delegation.actions) {
      const service = this.shortServiceName(action.split("/")[0]);
      const actions = byService.get(service) ?? [];
      actions.push(action);
      byService.set(service, actions);
    }
    return [...byService.entries()].map(([service, actions]) => ({
      service,
      space: delegation.spaceId,
      path: delegation.path,
      actions
    }));
  }
  /**
   * Build the abilities/rawAbilities maps for a wallet-mode activation
   * sub-delegation from the FULL resource set of a received delegation.
   *
   * Each entry in `delegation.resources[]` is one `(service, space, path,
   * actions)` grant; the flat top-level `path`/`actions` mirror only the
   * first resource. We must reconstruct every grant so the activated
   * session carries all of them (e.g. both `tinycloud.kv/get` and
   * `tinycloud.encryption/decrypt`) — not just the primary one.
   *
   * Encryption resources are raw network URNs (space-independent) and go
   * into `rawAbilities`. All other resources are space-scoped and go into
   * `abilities` keyed by short service name. The activation `prepareSession`
   * call uses a single `spaceId` (`delegation.spaceId`), so every
   * non-encryption resource must target that same space — which is exactly
   * what the multi-resource issuance path enforces. A resource targeting a
   * different space cannot be activated in one call, so we fail loudly
   * rather than silently dropping it.
   *
   * @internal
   */
  buildActivationAbilities(delegation) {
    var _a, _b, _c;
    const resources = delegation.resources !== void 0 && delegation.resources.length > 0 ? delegation.resources : this.flatDelegationResources(delegation);
    const abilities = {};
    const rawAbilities = {};
    const addActions = (target, actions) => {
      const seen = new Set(target);
      for (const action of actions) {
        if (!seen.has(action)) {
          target.push(action);
          seen.add(action);
        }
      }
    };
    for (const resource of resources) {
      const service = this.invocationServiceName(resource.service);
      if (this.isEncryptionNetworkOperation(service, resource.path)) {
        rawAbilities[_a = resource.path] ?? (rawAbilities[_a] = []);
        addActions(rawAbilities[resource.path], resource.actions);
        continue;
      }
      if (resource.space !== delegation.spaceId) {
        throw new Error(
          `useDelegation: resource targets space '${resource.space}' but the delegation activates space '${delegation.spaceId}'. Multi-space delegations cannot be activated in a single useDelegation call.`
        );
      }
      abilities[service] ?? (abilities[service] = {});
      (_b = abilities[service])[_c = resource.path] ?? (_b[_c] = []);
      addActions(abilities[service][resource.path], resource.actions);
    }
    return { abilities, rawAbilities };
  }
  selectInvocationSession(fallback, service, path, action) {
    const grant = this.findGrantForOperation({
      spaceId: fallback.spaceId,
      service: this.invocationServiceName(service),
      path,
      action
    });
    return grant?.session ?? fallback;
  }
  findGrantForOperations(operations, options) {
    if (operations.length === 0) {
      return void 0;
    }
    this.pruneExpiredRuntimePermissionGrants();
    const covering = this.runtimePermissionGrants.filter((grant) => {
      if (options?.excludePrimary && grant.provenance === "primary") {
        return false;
      }
      return operations.every(
        (operation) => grant.operations.some(
          (granted) => this.operationCovers(granted, operation)
        )
      );
    });
    if (covering.length === 0) {
      return void 0;
    }
    return covering.find((grant) => grant.provenance === "primary") ?? covering[0];
  }
  findGrantForOperation(operation, options) {
    return this.findGrantForOperations([operation], options);
  }
  pruneExpiredRuntimePermissionGrants() {
    const now = Date.now();
    this.runtimePermissionGrants = this.runtimePermissionGrants.filter(
      (grant) => grant.expiresAt.getTime() > now
    );
  }
  operationCovers(granted, requested) {
    if (granted.service !== requested.service || !this.actionContains(granted.action, requested.action)) {
      return false;
    }
    if (granted.resource !== void 0 || requested.resource !== void 0) {
      return granted.resource !== void 0 && requested.resource !== void 0 && granted.resource === requested.resource && this.pathContains(granted.path, requested.path);
    }
    return granted.spaceId !== void 0 && requested.spaceId !== void 0 && this.spaceIdsEqual(granted.spaceId, requested.spaceId) && this.pathContains(granted.path, requested.path);
  }
  // Space IDs are `tinycloud:pkh:eip155:<chain>:<0xADDR>:<name>`. The embedded
  // EIP-155 address is case-insensitive, but the CLI canonicalizes it to
  // lowercase when building a space URI while stored runtime delegations keep
  // the EIP-55 checksummed form — so a byte-for-byte compare spuriously rejects
  // an otherwise-valid grant. Lowercase ONLY the `eip155:<chain>:0x<addr>`
  // segment and leave everything else (crucially the case-sensitive space NAME)
  // byte-exact. Mirrors the CLI's `normalizeSpaceForCompare` (OPENKEY_SCOPE_MISMATCH fix).
  spaceIdsEqual(a, b) {
    return this.normalizeSpaceAddress(a) === this.normalizeSpaceAddress(b);
  }
  normalizeSpaceAddress(space) {
    return space.replace(
      /(eip155:\d+:)(0x[0-9a-fA-F]{40})/,
      (_match, prefix, addr) => prefix + addr.toLowerCase()
    );
  }
  actionContains(grantedAction, requestedAction) {
    if (grantedAction === requestedAction) {
      return true;
    }
    if (grantedAction.endsWith("/*")) {
      const prefix = grantedAction.slice(0, -2);
      return requestedAction.startsWith(`${prefix}/`);
    }
    return false;
  }
  invocationServiceName(service) {
    return service.startsWith("tinycloud.") ? this.shortServiceName(service) : service;
  }
  isEncryptionNetworkOperation(service, path) {
    return service === "encryption" && path.startsWith("urn:tinycloud:encryption:");
  }
  operationFromInvokeAnyEntry(entry) {
    const service = this.invocationServiceName(entry.service);
    if (typeof entry.resource === "string") {
      return {
        resource: entry.resource,
        service,
        path: entry.path,
        action: entry.action
      };
    }
    if (this.isEncryptionNetworkOperation(service, entry.path)) {
      return {
        resource: entry.path,
        service,
        path: entry.path,
        action: entry.action
      };
    }
    if (typeof entry.spaceId === "string") {
      return {
        spaceId: entry.spaceId,
        service,
        path: entry.path,
        action: entry.action
      };
    }
    return void 0;
  }
  pathContains(grantedPath, requestedPath) {
    if (grantedPath === "" || grantedPath === "/") {
      return true;
    }
    if (grantedPath.endsWith("/**")) {
      return requestedPath.startsWith(grantedPath.slice(0, -3));
    }
    if (grantedPath.endsWith("/*")) {
      const prefix = grantedPath.slice(0, -2);
      if (!requestedPath.startsWith(prefix)) {
        return false;
      }
      const remainder = requestedPath.slice(prefix.length);
      return !remainder.includes("/") || remainder === "/";
    }
    if (grantedPath.endsWith("/")) {
      return requestedPath.startsWith(grantedPath);
    }
    return grantedPath === requestedPath;
  }
  /**
   * Issue a delegation via the legacy wallet-signed SIWE path for a single
   * {@link PermissionEntry}. Shares the implementation with the public
   * `createDelegation` method via {@link createDelegationWalletPath} so
   * both entry points hit exactly the same SIWE / signer / public-space
   * logic without mutual recursion.
   *
   * @internal
   */
  async createDelegationLegacyWalletPath(delegateDID, entry, expirationTime) {
    const session = this.auth?.tinyCloudSession;
    const spaceIdOverride = session === void 0 || entry.space === "default" ? void 0 : this.resolvePermissionSpace(entry.space, session);
    return this.createDelegationWalletPath({
      path: entry.path,
      actions: entry.actions,
      delegateDID,
      includePublicSpace: true,
      expiryMs: Math.max(0, expirationTime.getTime() - Date.now()),
      spaceIdOverride
    });
  }
  /**
   * Create a delegation from this user to another user.
   *
   * The delegation grants the recipient access to a specific path and actions
   * within this user's space.
   *
   * @param params - Delegation parameters
   * @returns A portable delegation that can be sent to the recipient
   */
  async createDelegation(params) {
    if (!this.signer) {
      throw new Error("Cannot createDelegation() in session-only mode. Requires wallet mode.");
    }
    if (!this.auth?.tinyCloudSession) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    let resolvedDelegateDID = params.delegateDID;
    if (resolvedDelegateDID.endsWith(".eth") && this.config.ensResolver) {
      const address = await this.config.ensResolver.resolveAddress(resolvedDelegateDID);
      if (!address) throw new Error(`Could not resolve ENS name: ${resolvedDelegateDID}`);
      resolvedDelegateDID = pkhDid2(address, 1);
    }
    const entries = legacyParamsToPermissionEntries(
      params.actions,
      params.path,
      params.spaceIdOverride
    );
    try {
      const result = await this.delegateTo(
        resolvedDelegateDID,
        entries,
        params.expiryMs !== void 0 ? { expiry: params.expiryMs } : void 0
      );
      return result.delegation;
    } catch (err) {
      if (err instanceof PermissionNotInManifestError) {
      } else {
        throw err;
      }
    }
    return this.createDelegationWalletPath({
      ...params,
      delegateDID: resolvedDelegateDID
    });
  }
  /**
   * Legacy wallet-signed SIWE delegation path. Lifted from the original
   * `createDelegation` body verbatim so both the legacy public method and
   * `delegateTo({ forceWalletSign: true })` hit the same code.
   *
   * @internal
   */
  async createDelegationWalletPath(params) {
    if (!this.signer) {
      throw new Error("Cannot createDelegation() in session-only mode. Requires wallet mode.");
    }
    const session = this.auth?.tinyCloudSession;
    if (!session) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const abilities = {};
    const kvActions = params.actions.filter((a) => a.startsWith("tinycloud.kv/"));
    const sqlActions = params.actions.filter((a) => a.startsWith("tinycloud.sql/"));
    const duckdbActions = params.actions.filter((a) => a.startsWith("tinycloud.duckdb/"));
    if (kvActions.length > 0) {
      abilities.kv = { [params.path]: kvActions };
    }
    if (sqlActions.length > 0) {
      abilities.sql = { [params.path]: sqlActions };
    }
    if (duckdbActions.length > 0) {
      abilities.duckdb = { [params.path]: duckdbActions };
    }
    const now = /* @__PURE__ */ new Date();
    const expiryMs = params.expiryMs ?? 60 * 60 * 1e3;
    const expirationTime = new Date(now.getTime() + expiryMs);
    const prepared = this.wasmBindings.prepareSession({
      abilities,
      address: this.wasmBindings.ensureEip55(session.address),
      chainId: session.chainId,
      domain: this.siweDomain,
      issuedAt: now.toISOString(),
      expirationTime: expirationTime.toISOString(),
      spaceId: params.spaceIdOverride ?? session.spaceId,
      delegateUri: params.delegateDID,
      parents: [session.delegationCid]
    });
    const signature2 = await this.signer.signMessage(prepared.siwe);
    const delegationSession = this.wasmBindings.completeSessionSetup({
      ...prepared,
      signature: signature2
    });
    const activateResult = await activateSessionWithHost2(
      this.config.host,
      delegationSession.delegationHeader
    );
    if (!activateResult.success) {
      throw new Error(`Failed to activate delegation: ${activateResult.error}`);
    }
    const result = {
      cid: delegationSession.delegationCid,
      delegationHeader: delegationSession.delegationHeader,
      spaceId: params.spaceIdOverride ?? session.spaceId,
      path: params.path,
      actions: params.actions,
      disableSubDelegation: params.disableSubDelegation ?? false,
      expiry: expirationTime,
      delegateDID: params.delegateDID,
      ownerAddress: session.address,
      chainId: session.chainId,
      host: this.config.host
    };
    const hasKvActions = params.actions.some((a) => a.startsWith("tinycloud.kv/"));
    if (hasKvActions && params.includePublicSpace !== false) {
      const publicSpaceId = makePublicSpaceId(
        this.wasmBindings.ensureEip55(session.address),
        session.chainId
      );
      const publicAbilities = {
        kv: { "": [KV2.GET, KV2.PUT, KV2.METADATA] }
      };
      const publicPrepared = this.wasmBindings.prepareSession({
        abilities: publicAbilities,
        address: this.wasmBindings.ensureEip55(session.address),
        chainId: session.chainId,
        domain: this.siweDomain,
        issuedAt: now.toISOString(),
        expirationTime: expirationTime.toISOString(),
        spaceId: publicSpaceId,
        delegateUri: params.delegateDID,
        parents: [session.delegationCid]
      });
      const publicSignature = await this.signer.signMessage(publicPrepared.siwe);
      const publicSession = this.wasmBindings.completeSessionSetup({
        ...publicPrepared,
        signature: publicSignature
      });
      const publicActivateResult = await activateSessionWithHost2(
        this.config.host,
        publicSession.delegationHeader
      );
      if (publicActivateResult.success) {
        result.publicDelegation = {
          cid: publicSession.delegationCid,
          delegationHeader: publicSession.delegationHeader,
          spaceId: publicSpaceId,
          path: "",
          actions: [KV2.GET, KV2.PUT, KV2.METADATA],
          disableSubDelegation: params.disableSubDelegation ?? false,
          expiry: expirationTime,
          delegateDID: params.delegateDID,
          ownerAddress: session.address,
          chainId: session.chainId,
          host: this.config.host
        };
      }
    }
    return result;
  }
  /**
   * Use a delegation received from another user.
   *
   * This creates a new session key for this user that chains from the
   * received delegation, allowing operations on the delegator's space.
   *
   * Works in both modes:
   * - **Wallet mode**: Creates a SIWE sub-delegation from PKH to session key
   * - **Session-only mode**: Uses the delegation directly (must target session key DID)
   *
   * @param delegation - The PortableDelegation to use (from createDelegation or transport)
   * @returns A DelegatedAccess instance for performing operations
   */
  async useDelegation(delegation) {
    const delegationHeader = delegation.delegationHeader;
    const targetHost = delegation.host ?? this.config.host;
    if (this.isSessionOnly) {
      const myDid = this.did;
      if (!didPrincipalMatches2(delegation.delegateDID, myDid)) {
        throw new Error(
          `Delegation targets ${delegation.delegateDID} but this user's DID is ${myDid}. The delegation must target this user's DID.`
        );
      }
      const session2 = {
        address: delegation.ownerAddress,
        chainId: delegation.chainId,
        sessionKey: JSON.stringify(this.sessionKeyJwk),
        spaceId: delegation.spaceId,
        delegationCid: delegation.cid,
        delegationHeader,
        verificationMethod: this.sessionDid,
        jwk: this.sessionKeyJwk,
        siwe: "",
        // Not used in session-only mode
        signature: ""
        // Not used in session-only mode
      };
      this.trackReceivedDelegation(delegation, this.sessionKeyJwk);
      this.installRuntimeGrantFromServiceSession(
        delegation,
        {
          delegationHeader: session2.delegationHeader,
          delegationCid: session2.delegationCid,
          spaceId: session2.spaceId,
          verificationMethod: session2.verificationMethod,
          jwk: session2.jwk
        },
        delegation.expiry
      );
      return new DelegatedAccess(
        session2,
        delegation,
        targetHost,
        this.wasmBindings.invoke,
        this.wasmBindings.invokeAny,
        this.config.telemetry
      );
    }
    const mySession = this.auth?.tinyCloudSession;
    if (!mySession) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    const jwk = mySession.jwk;
    const { abilities, rawAbilities } = this.buildActivationAbilities(delegation);
    const now = /* @__PURE__ */ new Date();
    const maxExpiry = new Date(now.getTime() + 60 * 60 * 1e3);
    const expirationTime = delegation.expiry < maxExpiry ? delegation.expiry : maxExpiry;
    const prepared = this.wasmBindings.prepareSession({
      abilities,
      address: this.wasmBindings.ensureEip55(mySession.address),
      chainId: mySession.chainId,
      domain: this.siweDomain,
      issuedAt: now.toISOString(),
      expirationTime: expirationTime.toISOString(),
      spaceId: delegation.spaceId,
      jwk,
      parents: [delegation.cid],
      ...Object.keys(rawAbilities).length > 0 ? { rawAbilities } : {}
    });
    const signature2 = await this.signer.signMessage(prepared.siwe);
    const invokerSession = this.wasmBindings.completeSessionSetup({
      ...prepared,
      signature: signature2
    });
    const activateResult = await activateSessionWithHost2(
      targetHost,
      invokerSession.delegationHeader
    );
    if (!activateResult.success) {
      throw new Error(`Failed to activate delegated session: ${activateResult.error}`);
    }
    const session = {
      address: mySession.address,
      chainId: mySession.chainId,
      sessionKey: mySession.sessionKey,
      spaceId: delegation.spaceId,
      delegationCid: invokerSession.delegationCid,
      delegationHeader: invokerSession.delegationHeader,
      verificationMethod: mySession.verificationMethod,
      jwk,
      siwe: prepared.siwe,
      signature: signature2
    };
    this.trackReceivedDelegation(delegation, jwk);
    this.installRuntimeGrantFromServiceSession(
      delegation,
      {
        delegationHeader: session.delegationHeader,
        delegationCid: session.delegationCid,
        spaceId: session.spaceId,
        verificationMethod: session.verificationMethod,
        jwk: session.jwk
      },
      expirationTime
    );
    return new DelegatedAccess(
      session,
      delegation,
      targetHost,
      this.wasmBindings.invoke,
      this.wasmBindings.invokeAny,
      this.config.telemetry
    );
  }
  /**
   * Create a sub-delegation from a received delegation.
   *
   * This allows further delegating access that was received from another user,
   * if the original delegation allows sub-delegation.
   *
   * @param parentDelegation - The delegation received from another user
   * @param params - Sub-delegation parameters (must be within parent's scope)
   * @returns A portable delegation for the sub-delegate
   */
  async createSubDelegation(parentDelegation, params) {
    if (!this.signer) {
      throw new Error("Cannot createSubDelegation() in session-only mode. Requires wallet mode.");
    }
    if (!this._address) {
      throw new Error("Not signed in. Call signIn() first.");
    }
    if (parentDelegation.disableSubDelegation) {
      throw new Error("Parent delegation does not allow sub-delegation");
    }
    if (!params.path.startsWith(parentDelegation.path)) {
      throw new Error(
        `Sub-delegation path "${params.path}" must be within parent path "${parentDelegation.path}"`
      );
    }
    const parentActions = new Set(parentDelegation.actions);
    for (const action of params.actions) {
      if (!parentActions.has(action)) {
        throw new Error(
          `Sub-delegation action "${action}" is not in parent's actions: ${parentDelegation.actions.join(", ")}`
        );
      }
    }
    const now = /* @__PURE__ */ new Date();
    const expiryMs = params.expiryMs ?? 60 * 60 * 1e3;
    const requestedExpiry = new Date(now.getTime() + expiryMs);
    const actualExpiry = requestedExpiry > parentDelegation.expiry ? parentDelegation.expiry : requestedExpiry;
    const abilities = {};
    const kvActions = params.actions.filter((a) => a.startsWith("tinycloud.kv/"));
    const sqlActions = params.actions.filter((a) => a.startsWith("tinycloud.sql/"));
    const duckdbActions = params.actions.filter((a) => a.startsWith("tinycloud.duckdb/"));
    if (kvActions.length > 0) {
      abilities.kv = { [params.path]: kvActions };
    }
    if (sqlActions.length > 0) {
      abilities.sql = { [params.path]: sqlActions };
    }
    if (duckdbActions.length > 0) {
      abilities.duckdb = { [params.path]: duckdbActions };
    }
    const targetHost = parentDelegation.host ?? this.config.host;
    const prepared = this.wasmBindings.prepareSession({
      abilities,
      address: this.wasmBindings.ensureEip55(this._address),
      chainId: this._chainId,
      domain: this.siweDomain,
      issuedAt: now.toISOString(),
      expirationTime: actualExpiry.toISOString(),
      spaceId: parentDelegation.spaceId,
      delegateUri: params.delegateDID,
      parents: [parentDelegation.cid]
    });
    const signature2 = await this.signer.signMessage(prepared.siwe);
    const subDelegationSession = this.wasmBindings.completeSessionSetup({
      ...prepared,
      signature: signature2
    });
    const activateResult = await activateSessionWithHost2(
      targetHost,
      subDelegationSession.delegationHeader
    );
    if (!activateResult.success) {
      throw new Error(`Failed to activate sub-delegation: ${activateResult.error}`);
    }
    return {
      cid: subDelegationSession.delegationCid,
      delegationHeader: subDelegationSession.delegationHeader,
      spaceId: parentDelegation.spaceId,
      path: params.path,
      actions: params.actions,
      disableSubDelegation: params.disableSubDelegation ?? false,
      expiry: actualExpiry,
      delegateDID: params.delegateDID,
      ownerAddress: parentDelegation.ownerAddress,
      chainId: parentDelegation.chainId,
      host: targetHost
    };
  }
};
// ===========================================================================
// Capability-chain delegation (spec: .claude/specs/capability-chain.md)
// ===========================================================================
/**
 * Safety margin before the session's own expiry at which {@link delegateTo}
 * will refuse to issue a derived delegation. Prevents issuing sub-delegations
 * that would be invalid by the time the recipient used them. Spec: 60 seconds.
 *
 * @internal
 */
_TinyCloudNode.SESSION_EXPIRY_SAFETY_MARGIN_MS = 6e4;
var TinyCloudNode = _TinyCloudNode;

// src/nodeDefaults.ts
TinyCloudNode.registerNodeDefaults({
  createWasmBindings: () => new NodeWasmBindings(),
  createSigner: (privateKey, chainId) => new PrivateKeySigner(privateKey, chainId)
});

// src/index.ts
import { TinyCloud as TinyCloud2 } from "@tinycloud/sdk-core";
import {
  SilentNotificationHandler as SilentNotificationHandler2,
  AutoApproveSpaceCreationHandler as AutoApproveSpaceCreationHandler2,
  defaultSpaceCreationHandler,
  IdentityParseError,
  addressStorageKey,
  canonicalizeAddress as canonicalizeAddress3,
  canonicalizeDid,
  canonicalizeDidUrl,
  canonicalizeNetworkId,
  didCacheKey,
  didEquals,
  isEvmAddress,
  makePkhSpaceId as makePkhSpaceId2,
  parsePkhDid,
  pkhDid as pkhDid3,
  principalDid,
  principalDidEquals as principalDidEquals3,
  parseCanonicalNetworkId,
  TinyCloudDebugLogger,
  tinyCloudDebugLogger,
  enableTinyCloudDebug,
  disableTinyCloudDebug,
  getTinyCloudDebugLogs,
  clearTinyCloudDebugLogs,
  installTinyCloudDebugGlobals
} from "@tinycloud/sdk-core";

// src/storage/FileSessionStorage.ts
import { validatePersistedSessionData } from "@tinycloud/sdk-core";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
var FileSessionStorage = class {
  /**
   * Create a new FileSessionStorage.
   *
   * @param baseDir - Directory to store session files (default: ~/.tinycloud/sessions)
   */
  constructor(baseDir) {
    this.baseDir = baseDir || this.getDefaultDir();
    this.ensureDirectoryExists();
  }
  /**
   * Get the default session storage directory.
   */
  getDefaultDir() {
    const home = process.env.HOME || process.env.USERPROFILE || "/tmp";
    return join(home, ".tinycloud", "sessions");
  }
  /**
   * Ensure the storage directory exists.
   */
  ensureDirectoryExists() {
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }
  }
  /**
   * Get the file path for an address.
   */
  getFilePath(address) {
    const normalizedAddress = address.toLowerCase();
    const filename = `${normalizedAddress.replace("0x", "")}.json`;
    return join(this.baseDir, filename);
  }
  /**
   * Save a session for an address.
   */
  async save(address, session) {
    const filePath = this.getFilePath(address);
    const data = JSON.stringify(session, null, 2);
    writeFileSync(filePath, data, "utf-8");
  }
  /**
   * Load a session for an address.
   */
  async load(address) {
    const filePath = this.getFilePath(address);
    if (!existsSync(filePath)) {
      return null;
    }
    try {
      const data = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(data);
      const validation = validatePersistedSessionData(parsed);
      if (!validation.ok) {
        console.warn(`Invalid session data for ${address}:`, validation.error.message);
        unlinkSync(filePath);
        return null;
      }
      const session = validation.data;
      const expiresAt = new Date(session.expiresAt);
      if (expiresAt < /* @__PURE__ */ new Date()) {
        unlinkSync(filePath);
        return null;
      }
      return session;
    } catch (error) {
      try {
        unlinkSync(filePath);
      } catch {
      }
      return null;
    }
  }
  /**
   * Clear a session for an address.
   */
  async clear(address) {
    const filePath = this.getFilePath(address);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
  /**
   * Check if a session exists for an address.
   */
  exists(address) {
    const filePath = this.getFilePath(address);
    if (!existsSync(filePath)) {
      return false;
    }
    try {
      const data = readFileSync(filePath, "utf-8");
      const session = JSON.parse(data);
      const expiresAt = new Date(session.expiresAt);
      if (expiresAt < /* @__PURE__ */ new Date()) {
        unlinkSync(filePath);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Check if file system storage is available.
   */
  isAvailable() {
    try {
      this.ensureDirectoryExists();
      return existsSync(this.baseDir);
    } catch {
      return false;
    }
  }
};

// src/index.ts
import {
  ACCOUNT_REGISTRY_PATH,
  ACCOUNT_REGISTRY_SPACE as ACCOUNT_REGISTRY_SPACE2,
  DEFAULT_MANIFEST_SPACE as DEFAULT_MANIFEST_SPACE2,
  DEFAULT_MANIFEST_VERSION,
  VAULT_PERMISSION_SERVICE,
  PermissionNotInManifestError as PermissionNotInManifestError2,
  SessionExpiredError as SessionExpiredError2,
  ManifestValidationError,
  composeManifestRequest as composeManifestRequest2,
  resolveManifest as resolveManifest2,
  validateManifest,
  loadManifest,
  isCapabilitySubset as isCapabilitySubset2,
  expandActionShortNames,
  expandPermissionEntries as expandPermissionEntries2,
  expandPermissionEntry,
  parseExpiry as parseExpiry2,
  resourceCapabilitiesToSpaceAbilitiesMap as resourceCapabilitiesToSpaceAbilitiesMap2
} from "@tinycloud/sdk-core";

// src/delegation.ts
async function grantAuthRequest(authority, request, options) {
  if (request.kind !== "tinycloud.auth.request") {
    throw new Error(
      `grantAuthRequest expects a tinycloud.auth.request artifact, got "${request.kind}".`
    );
  }
  if (!Array.isArray(request.requested) || request.requested.length === 0) {
    throw new Error("grantAuthRequest request has no requested capabilities.");
  }
  const expiry = options?.expiry ?? request.requestedExpiry;
  const result = await authority.delegateTo(
    request.sessionDid,
    request.requested,
    expiry !== void 0 ? { expiry } : void 0
  );
  return {
    kind: "tinycloud.auth.delegation",
    version: 1,
    requestId: request.requestId,
    delegationCid: result.delegation.cid,
    delegation: result.delegation,
    permissions: request.requested,
    expiry: result.delegation.expiry.toISOString(),
    prompted: result.prompted
  };
}
function serializeDelegation(delegation) {
  return JSON.stringify({
    ...delegation,
    expiry: delegation.expiry.toISOString()
  });
}
function deserializeDelegation(data) {
  const parsed = JSON.parse(data);
  return {
    ...parsed,
    cid: parsed.cid,
    expiry: new Date(parsed.expiry)
  };
}

// src/index.ts
import {
  DEFAULT_SIGNED_READ_URL_EXPIRY_MS,
  KVService as KVService3,
  PrefixedKVService
} from "@tinycloud/sdk-core";
import { SQLService as SQLService3, SQLAction, DatabaseHandle } from "@tinycloud/sdk-core";
import {
  DuckDbService as DuckDbService3,
  DuckDbDatabaseHandle,
  DuckDbAction
} from "@tinycloud/sdk-core";
import {
  DataVaultService as DataVaultService2,
  VaultHeaders,
  VaultPublicSpaceKVActions,
  createVaultCrypto as createVaultCrypto2,
  SecretsService as SecretsService2,
  SECRET_NAME_RE,
  canonicalizeSecretScope,
  resolveSecretListPrefix as resolveSecretListPrefix2,
  resolveSecretPath as resolveSecretPath2
} from "@tinycloud/sdk-core";
import {
  EncryptionService as EncryptionService2,
  parseNetworkId as parseNetworkId3,
  buildNetworkId,
  isNetworkId,
  networkDiscoveryKey,
  NetworkIdError,
  ENCRYPTION_NETWORK_URN_PREFIX,
  NETWORK_NAME_PATTERN,
  canonicalizeEncryptionJson as canonicalizeEncryptionJson2,
  canonicalHashHex as canonicalHashHex2,
  hexEncode,
  hexDecode,
  encryptionBase64Encode,
  encryptionBase64Decode,
  encryptionUtf8Encode,
  encryptionUtf8Decode,
  encryptToNetwork,
  decryptEnvelopeWithKey,
  validateEnvelope,
  generateRandomReceiverKey,
  deriveSignedReceiverKey,
  buildCanonicalDecryptRequest,
  buildDecryptFacts,
  buildDecryptAttenuation,
  buildDecryptInvocation,
  checkDecryptInvocationInput,
  verifyDecryptResponse,
  canonicalSignedResponse,
  openWrappedKey,
  discoverNetwork,
  ensureNetworkUsableForDecrypt,
  DEFAULT_ENCRYPTION_ALG,
  ENVELOPE_VERSION,
  DEFAULT_KEY_VERSION,
  DECRYPT_FACT_TYPE,
  DECRYPT_RESULT_TYPE,
  DECRYPT_ACTION as DECRYPT_ACTION3,
  ENCRYPTION_SERVICE,
  ENCRYPTION_SERVICE_SHORT,
  encryptionError
} from "@tinycloud/sdk-core";
import { HooksService as HooksService3 } from "@tinycloud/sdk-core";
import {
  DelegationManager as DelegationManager2,
  SharingService as SharingService2,
  createSharingService,
  DelegationErrorCodes
} from "@tinycloud/sdk-core";
import {
  CapabilityKeyRegistry as CapabilityKeyRegistry2,
  createCapabilityKeyRegistry,
  CapabilityKeyRegistryErrorCodes
} from "@tinycloud/sdk-core";
import {
  SpaceService as SpaceService2,
  SpaceErrorCodes,
  createSpaceService,
  parseSpaceUri,
  buildSpaceUri,
  makePublicSpaceId as makePublicSpaceId2,
  Space
} from "@tinycloud/sdk-core";
import {
  ProtocolMismatchError,
  VersionCheckError,
  UnsupportedFeatureError as UnsupportedFeatureError2,
  checkNodeInfo as checkNodeInfo2
} from "@tinycloud/sdk-core";
import { ServiceContext as ServiceContext3 } from "@tinycloud/sdk-core";
export {
  ACCOUNT_REGISTRY_PATH,
  ACCOUNT_REGISTRY_SPACE2 as ACCOUNT_REGISTRY_SPACE,
  AccountService,
  AutoApproveSpaceCreationHandler2 as AutoApproveSpaceCreationHandler,
  CapabilityKeyRegistry2 as CapabilityKeyRegistry,
  CapabilityKeyRegistryErrorCodes,
  DECRYPT_ACTION3 as DECRYPT_ACTION,
  DECRYPT_FACT_TYPE,
  DECRYPT_RESULT_TYPE,
  DEFAULT_ENCRYPTION_ALG,
  DEFAULT_KEY_VERSION,
  DEFAULT_MANIFEST_SPACE2 as DEFAULT_MANIFEST_SPACE,
  DEFAULT_MANIFEST_VERSION,
  DEFAULT_SIGNED_READ_URL_EXPIRY_MS,
  DataVaultService2 as DataVaultService,
  DatabaseHandle,
  DelegatedAccess,
  DelegationErrorCodes,
  DelegationManager2 as DelegationManager,
  DuckDbAction,
  DuckDbDatabaseHandle,
  DuckDbService3 as DuckDbService,
  ENCRYPTION_NETWORK_URN_PREFIX,
  ENCRYPTION_SERVICE,
  ENCRYPTION_SERVICE_SHORT,
  ENVELOPE_VERSION,
  EncryptionService2 as EncryptionService,
  FileSessionStorage,
  HooksService3 as HooksService,
  IdentityParseError,
  KVService3 as KVService,
  ManifestValidationError,
  MemorySessionStorage,
  NETWORK_NAME_PATTERN,
  NetworkIdError,
  NodeUserAuthorization,
  NodeWasmBindings,
  PermissionNotInManifestError2 as PermissionNotInManifestError,
  PrefixedKVService,
  PrivateKeySigner,
  ProtocolMismatchError,
  SECRET_NAME_RE,
  SQLAction,
  SQLService3 as SQLService,
  SecretsService2 as SecretsService,
  ServiceContext3 as ServiceContext,
  SessionExpiredError2 as SessionExpiredError,
  SharingService2 as SharingService,
  SilentNotificationHandler2 as SilentNotificationHandler,
  Space,
  SpaceErrorCodes,
  SpaceService2 as SpaceService,
  TinyCloud2 as TinyCloud,
  TinyCloudDebugLogger,
  TinyCloudNode,
  UnsupportedFeatureError2 as UnsupportedFeatureError,
  VAULT_PERMISSION_SERVICE,
  VaultHeaders,
  VaultPublicSpaceKVActions,
  VersionCheckError,
  WasmKeyProvider,
  addressStorageKey,
  buildCanonicalDecryptRequest,
  buildDecryptAttenuation,
  buildDecryptFacts,
  buildDecryptInvocation,
  buildNetworkId,
  buildSpaceUri,
  canonicalHashHex2 as canonicalHashHex,
  canonicalSignedResponse,
  canonicalizeAddress3 as canonicalizeAddress,
  canonicalizeDid,
  canonicalizeDidUrl,
  canonicalizeEncryptionJson2 as canonicalizeEncryptionJson,
  canonicalizeNetworkId,
  canonicalizeSecretScope,
  checkDecryptInvocationInput,
  checkNodeInfo2 as checkNodeInfo,
  clearTinyCloudDebugLogs,
  composeManifestRequest2 as composeManifestRequest,
  createCapabilityKeyRegistry,
  createOpenKeyCallbackSigningStrategy,
  createSharingService,
  createSpaceService,
  createVaultCrypto2 as createVaultCrypto,
  createWasmKeyProvider,
  decryptEnvelopeWithKey,
  defaultSignStrategy,
  defaultSpaceCreationHandler,
  deriveSignedReceiverKey,
  deserializeDelegation,
  didCacheKey,
  didEquals,
  disableTinyCloudDebug,
  discoverNetwork,
  enableTinyCloudDebug,
  encryptToNetwork,
  encryptionBase64Decode,
  encryptionBase64Encode,
  encryptionError,
  encryptionUtf8Decode,
  encryptionUtf8Encode,
  ensureNetworkUsableForDecrypt,
  expandActionShortNames,
  expandPermissionEntries2 as expandPermissionEntries,
  expandPermissionEntry,
  generateRandomReceiverKey,
  getTinyCloudDebugLogs,
  grantAuthRequest,
  hexDecode,
  hexEncode,
  installTinyCloudDebugGlobals,
  isCapabilitySubset2 as isCapabilitySubset,
  isEvmAddress,
  isNetworkId,
  loadManifest,
  makePkhSpaceId2 as makePkhSpaceId,
  makePublicSpaceId2 as makePublicSpaceId,
  networkDiscoveryKey,
  openWrappedKey,
  parseCanonicalNetworkId,
  parseExpiry2 as parseExpiry,
  parseNetworkId3 as parseNetworkId,
  parsePkhDid,
  parseSpaceUri,
  pkhDid3 as pkhDid,
  principalDid,
  principalDidEquals3 as principalDidEquals,
  resolveManifest2 as resolveManifest,
  resolveSecretListPrefix2 as resolveSecretListPrefix,
  resolveSecretPath2 as resolveSecretPath,
  resourceCapabilitiesToSpaceAbilitiesMap2 as resourceCapabilitiesToSpaceAbilitiesMap,
  serializeDelegation,
  tinyCloudDebugLogger,
  validateEnvelope,
  validateManifest,
  verifyDecryptResponse
};
/*! Bundled license information:

js-sha3/src/sha3.js:
  (**
   * [js-sha3]{@link https://github.com/emn178/js-sha3}
   *
   * @version 0.8.0
   * @author Chen, Yi-Cyuan [emn178@gmail.com]
   * @copyright Chen, Yi-Cyuan 2015-2018
   * @license MIT
   *)
*/
//# sourceMappingURL=index.js.map