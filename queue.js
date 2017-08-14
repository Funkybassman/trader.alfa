class QUEUE {
	constructor(opts) {
		if (!opts.name) return console.error("please specify name for queue");
        // this.name = opts.name;
		this.interval = opts.interval || 0;
		this.tasks = [];
		this.setNextTimeout();
	}

	proceed() {
		if (!this.tasks.length) return this.setNextTimeout();
		let task = this.tasks.shift();
		task();
		this.setNextTimeout();
	}

	setNextTimeout() {
		setTimeout(this.proceed.bind(this), this.interval);
	}

	addTask(f) {
        // console.log(this.name);
		this.tasks.push(f);
		return this.tasks.length;
	}
}

module.exports = QUEUE;