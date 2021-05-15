import { Inject, Injectable, Optional } from '@angular/core';
import * as moment from 'moment';

import {
	CalendarOriginal,
	CalendarDay,
	CalendarMonth,
	CalendarModalOptions,
	CalendarResult,
	DayConfig,
} from './calendar.models';
import { defaults, pickModes } from './utils/config';
import { DEFAULT_CALENDAR_OPTIONS } from './calendar-options.provider';

const isBoolean = (input: any) => input === true || input === false;

@Injectable({
	providedIn: 'root'
})
export class CalendarService {
	private readonly defaultOpts: CalendarModalOptions;

	constructor(@Optional() @Inject(DEFAULT_CALENDAR_OPTIONS) defaultOpts: CalendarModalOptions) {
		this.defaultOpts = defaultOpts;
	}

	get DEFAULT_STEP() {
		return 12;
	}

	safeOpt(calendarOptions: any = {}): CalendarModalOptions {
		const _disableWeeks: number[] = [];
		const _daysConfig: DayConfig[] = [];
    	let {
			from = new Date(),
			to = 0,
			weekStart = 0,
			step = this.DEFAULT_STEP,
			id = '',
			cssClass = '',
			closeLabel = 'CANCEL',
			doneLabel = 'DONE',
			monthFormat = 'MMM YYYY',
			yearFormat = 'YYYY',
			title = 'CALENDAR',
			defaultTitle = '',
			defaultSubtitle = '',
			autoDone = false,
			canBackwardsSelected = false,
			closeIcon = false,
			doneIcon = false,
			showYearPicker = false,
			isSaveHistory = false,
			pickMode = pickModes.SINGLE,
			color = defaults.COLOR,
			weekdays = defaults.WEEKS_FORMAT,
			daysConfig = _daysConfig,
			disableWeeks = _disableWeeks,
			showAdjacentMonthDay = true,
			defaultEndDateToStartDate = false,
			clearLabel = null,
		} = { ...this.defaultOpts, ...calendarOptions };

		return {
			id,
			from,
			to,
			pickMode,
			autoDone,
			color,
			cssClass,
			weekStart,
			closeLabel,
			closeIcon,
			doneLabel,
			doneIcon,
			canBackwardsSelected,
			isSaveHistory,
			disableWeeks,
			monthFormat,
			yearFormat,
			title,
			weekdays,
			daysConfig,
			step,
			showYearPicker,
			defaultTitle,
			defaultSubtitle,
			defaultScrollTo: calendarOptions.defaultScrollTo || from,
			defaultDate: calendarOptions.defaultDate || null,
			defaultDates: calendarOptions.defaultDates || null,
			defaultDateRange: calendarOptions.defaultDateRange || null,
			showAdjacentMonthDay,
			defaultEndDateToStartDate,
			clearLabel
		};
	}

	createOriginalCalendar(time: number): CalendarOriginal {
		const date = new Date(time);
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstWeek = new Date(year, month, 1).getDay();
		const howManyDays = moment(time).daysInMonth();
		return {
			year,
			month,
			firstWeek,
			howManyDays,
			time: new Date(year, month, 1).getTime(),
			date: new Date(time),
		};
	}

	findDayConfig(day: any, opt: CalendarModalOptions): any {
		if (!opt.daysConfig || opt.daysConfig?.length <= 0) { return null; }
		return opt.daysConfig?.find(n => day.isSame(n.date, 'day'));
	}

	createCalendarDay(time: number, opt: CalendarModalOptions, month?: number): CalendarDay {
		debugger;
		//const _time = moment(time);
		const date = moment(time);
		const isToday = moment().isSame(date, 'days');
		const dayConfig = this.findDayConfig(date, opt);

		let disable = false;

		if (dayConfig && isBoolean(dayConfig.disable)) {
			disable = dayConfig.disable;
		}
		else {
			disable = opt.disableWeeks.indexOf(date.toDate().getDay()) !== -1;

			if (!disable) {

				const _rangeBeg = moment(opt.from).valueOf();
				let _rangeEnd = moment(opt.to).valueOf();
				let isNotBetween = true;

				if (_rangeEnd === 0) _rangeEnd = moment().valueOf();

				if (!opt.canBackwardsSelected) {
					isNotBetween = !date.isBetween(_rangeBeg, _rangeEnd, 'days', '[]');
				} else {
					isNotBetween = moment(date).isBefore(_rangeBeg); // ? false : isBetween;
				}
				/*
				if (_rangeBeg > 0 && _rangeEnd > 0) {
					if (!opt.canBackwardsSelected) {
						isNotBetween = !_time.isBetween(_rangeBeg, _rangeEnd, 'days', '[]');
					} else {
						isNotBetween = moment(_time).isBefore(_rangeBeg); // ? false : isBetween;
					}
				} else if (_rangeBeg > 0 && _rangeEnd === 0) {
					if (!opt.canBackwardsSelected) {
						let _addTime = _time.add(1, 'day');
						isNotBetween = !_addTime.isAfter(_rangeBeg);
					} else {
						isNotBetween = false;
					}
				}
				*/

				disable = isNotBetween;
			}

		}

		let title = new Date(time).getDate().toString();
		if (dayConfig && dayConfig.title) {
			title = dayConfig.title;
		} else if (opt.defaultTitle) {
			title = opt.defaultTitle;
		}

		let subTitle = '';
		if (dayConfig && dayConfig.subTitle) {
			subTitle = dayConfig.subTitle;
		} else if (opt.defaultSubtitle) {
			subTitle = opt.defaultSubtitle;
		}
		
		return {
			time,
			isToday,
			title,
			subTitle,
			selected: false,
			isLastMonth: date.month() < month,
			isNextMonth: date.month() > month,
			marked: dayConfig ? dayConfig.marked || false : false,
			cssClass: dayConfig ? dayConfig.cssClass || '' : '',
			disable,
			isFirst: date.date() === 1,
			isLast: date.date() === date.daysInMonth(),
		};
	}

	createCalendarMonth(original: CalendarOriginal, opt: CalendarModalOptions): CalendarMonth {
		let days: Array<CalendarDay> = new Array(6).fill(null);
		let len = original.howManyDays;

		for (let i = original.firstWeek; i < len + original.firstWeek; i++) {
			let itemTime = new Date(original.year, original.month, i - original.firstWeek + 1).getTime();
			days[i] = this.createCalendarDay(itemTime, opt);
		}

		let weekStart = opt.weekStart;

		if (weekStart === 1) {
			if (days[0] === null) {
				days.shift();
			} else {
				days.unshift(...new Array(6).fill(null));
			}
		}

		if (opt.showAdjacentMonthDay) {
			const _booleanMap = days.map(e => !!e);
			const thisMonth = moment(original.time).month();
			let startOffsetIndex = _booleanMap.indexOf(true) - 1;
			let endOffsetIndex = _booleanMap.lastIndexOf(true) + 1;
			for (startOffsetIndex; startOffsetIndex >= 0; startOffsetIndex--) {
				const dayBefore = moment(days[startOffsetIndex + 1].time)
					.clone()
					.subtract(1, 'd');
				days[startOffsetIndex] = this.createCalendarDay(dayBefore.valueOf(), opt, thisMonth);
			}

			if (!(_booleanMap.length % 7 === 0 && _booleanMap[_booleanMap.length - 1])) {
				for (endOffsetIndex; endOffsetIndex < days.length + (endOffsetIndex % 7); endOffsetIndex++) {
					const dayAfter = moment(days[endOffsetIndex - 1].time)
						.clone()
						.add(1, 'd');
					days[endOffsetIndex] = this.createCalendarDay(dayAfter.valueOf(), opt, thisMonth);
				}
			}
		}

		return {
			days,
			original,
		};
	}

	createMonthsByPeriod(startTime: number, monthsNum: number, opt: CalendarModalOptions): Array<CalendarMonth> {
		debugger;
		let _array: Array<CalendarMonth> = [];

		let _start = new Date(startTime);
		let _startMonth = new Date(_start.getFullYear(), _start.getMonth(), 1).getTime();

		for (let i = 0; i < monthsNum; i++) {
			let time = moment(_startMonth).add(i, 'M').valueOf();
			let originalCalendar = this.createOriginalCalendar(time);
			
			_array.push(this.createCalendarMonth(originalCalendar, opt));
		}

		return _array;
	}

	createYearsByPeriod(startYear: number, yearsNum: number, opt: CalendarModalOptions): Array<CalendarMonth> {
		let _array: Array<CalendarMonth> = [];

		let _startYear = new Date(startYear, 0, 1).getTime();

		for (let i = 0; i < yearsNum; i++) {
			const time = moment(_startYear)
				.add(i, 'year')
				.valueOf();
			const originalCalendar = this.createOriginalCalendar(time);
			_array.push(this.createCalendarMonth(originalCalendar, opt));
		}

		return _array;
	}

	wrapResult(original: CalendarDay[], pickMode: string) {
		let result: any;
		switch (pickMode) {
			case pickModes.SINGLE:
				result = this.multiFormat(original[0].time);
				break;
			case pickModes.RANGE:
				result = {
					from: this.multiFormat(original[0].time),
					to: this.multiFormat((original[1] || original[0]).time),
				};
				break;
			case pickModes.MULTI:
				result = original.map(e => this.multiFormat(e.time));
				break;
			default:
				result = original;
		}
		return result;
	}

	multiFormat(time: number): CalendarResult {
		const _moment = moment(time);
		return {
			time: _moment.valueOf(),
			unix: _moment.unix(),
			dateObj: _moment.toDate(),
			string: _moment.format(defaults.DATE_FORMAT),
			years: _moment.year(),
			months: _moment.month() + 1,
			date: _moment.date(),
		};
	}
}
