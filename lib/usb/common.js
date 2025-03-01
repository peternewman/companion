const util = require('./util')
function common() {
	if (this.keysTotal === undefined) {
		this.keysTotal = this.info.keysTotal
	}

	if (this.keysPerRow === undefined) {
		this.keysPerRow = this.info.keysPerRow
	}
}

common.prototype.log = function () {
	console.log.apply(console, arguments)
}

// From Global key number 0->31, to Device key f.ex 0->14
// 0-4 would be 0-4, but 5-7 would be -1
// and 8-12 would be 5-9
common.prototype.toDeviceKey = function (key) {
	var self = this

	return util.toDeviceKey(self.keysTotal, self.keysPerRow, key)
}

// From device key number to global key number
// Reverse of toDeviceKey
common.prototype.toGlobalKey = function (key) {
	var self = this

	return util.toGlobalKey(self.keysPerRow, key)
}

common.prototype.handleBuffer = function (buffer) {
	var self = this

	if (buffer.type == 'Buffer') {
		buffer = Buffer.from(buffer.data)
	}

	if (buffer === undefined || buffer.length != 15552) {
		self.log('buffer was not 15552, but ' + buffer.length)
		var args = [].slice.call(arguments)
		return false
	}

	const rotation = (self._config ? self._config : self.config).rotation

	if (rotation === -90) {
		var buf = Buffer.alloc(15552)

		for (var x = 0; x < 72; ++x) {
			for (var y = 0; y < 72; ++y) {
				buf.writeUIntBE(buffer.readUIntBE(x * 72 * 3 + y * 3, 3), y * 72 * 3 + (71 - x) * 3, 3)
			}
		}
		buffer = buf
	}

	if (rotation === 180) {
		var buf = Buffer.alloc(15552)

		for (var x = 0; x < 72; ++x) {
			for (var y = 0; y < 72; ++y) {
				buf.writeUIntBE(buffer.readUIntBE(x * 72 * 3 + y * 3, 3), (71 - x) * 72 * 3 + (71 - y) * 3, 3)
			}
		}
		buffer = buf
	}

	if (rotation === 90) {
		var buf = Buffer.alloc(15552)

		for (var x = 0; x < 72; ++x) {
			for (var y = 0; y < 72; ++y) {
				buf.writeUIntBE(buffer.readUIntBE(x * 72 * 3 + y * 3, 3), (71 - y) * 72 * 3 + x * 3, 3)
			}
		}
		buffer = buf
	}

	return buffer
}

exports = module.exports = common
