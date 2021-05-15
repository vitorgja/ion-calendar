import { Component, Input, OnInit, Output, EventEmitter, forwardRef, Provider } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import * as moment from 'moment';

import {
  CalendarMonth,
  CalendarModalOptions,
  CalendarComponentOptions,
  CalendarDay,
  CalendarComponentPayloadTypes,
  CalendarComponentMonthChange,
  CalendarComponentTypeProperty,
} from '../calendar.models';
import { CalendarService } from '../calendar.service';

import { defaults, pickModes } from '../utils/config';

export const ION_CAL_VALUE_ACCESSOR: Provider = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => CalendarComponent),
  multi: true,
};

interface CompatibleIcons {
  caretDown: string;
  caretUp: string;
  chevronBack: string;
  chevronForward: string;
  chevronDown: string;
}

@Component({
  selector: 'ion-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  providers: [ION_CAL_VALUE_ACCESSOR]
})
export class CalendarComponent implements ControlValueAccessor, OnInit {
  _d: CalendarModalOptions;
  _options: CalendarComponentOptions;
  _view: 'year' | 'month' | 'days' = 'days';
  _calendarMonthValue: CalendarDay[] = [null, null];

  _showToggleButtons = true;
  get showToggleButtons(): boolean {
    return this._showToggleButtons;
  }

  set showToggleButtons(value: boolean) {
    this._showToggleButtons = value;
  }

  _showMonthPicker = true;
  get showMonthPicker(): boolean {
    return this._showMonthPicker;
  }

  set showMonthPicker(value: boolean) {
    this._showMonthPicker = value;
  }

  monthOpt: CalendarMonth;

  @Input()
  format: string = defaults.DATE_FORMAT;

  @Input()
  type: CalendarComponentTypeProperty = 'string';

  @Input()
  readonly = false;

  @Output()
  change: EventEmitter<CalendarComponentPayloadTypes> = new EventEmitter();

  @Output()
  monthChange: EventEmitter<CalendarComponentMonthChange> = new EventEmitter();

  @Output()
  select: EventEmitter<CalendarDay> = new EventEmitter();

  @Output()
  selectStart: EventEmitter<CalendarDay> = new EventEmitter();

  @Output()
  selectEnd: EventEmitter<CalendarDay> = new EventEmitter();

  @Input()
  set options(value: CalendarComponentOptions) {
    this._options = value;
    this.initOpt();
    if (this.monthOpt && this.monthOpt.original) {
      this.monthOpt = this.createMonth(this.monthOpt.original.time);
    }
  }
  get options(): CalendarComponentOptions {
    return this._options;
  }

  readonly MONTH_DATE_FORMAT = 'MMMM yyyy';

  constructor(public calSvc: CalendarService) { }

  ngOnInit(): void {
    this.initOpt();
    this.monthOpt = this.createMonth(new Date().getTime());

    console.log('calendar.ngOnInit', this.monthOpt);
  }

  getViewDate() {
    return this._handleType(this.monthOpt.original.time);
  }

  getDate(date: number) {
    return new Date(date);
  }

  setViewDate(value: CalendarComponentPayloadTypes) {
    this.monthOpt = this.createMonth(this._payloadToTimeNumber(value));
  }

  switchView(showYear: boolean): void {
    this._view = this._view === 'days' ? 'month'
      : showYear && this._view === 'month' ? 'year' : 'days';
  }
  switchIcon(showYear: boolean): string {
    return this._view === 'days' ? 'caret-down'
      : showYear && this._view === 'month' ? 'caret-down' : 'caret-up';
  }

  prev(): void {
    if (this._view === 'days') {
      this.backMonth();
    } else {
      this.prevYear();
    }

    console.log('calendar.prev', this.monthOpt.days);
  }

  next(): void {
    if (this._view === 'days') {
      this.nextMonth();
    } else {
      this.nextYear();
    }

    console.log('calendar.next', this.monthOpt.days);
  }

  prevYear(): void {
    // if (moment(this.monthOpt.original.time).year() === 1970) { return; }
    const backTime = moment(this.monthOpt.original.time)
      .subtract(1, 'year')
      .valueOf();
    this.monthOpt = this.createMonth(backTime);
  }

  nextYear(): void {
    const nextTime = moment(this.monthOpt.original.time)
      .add(1, 'year')
      .valueOf();
    this.monthOpt = this.createMonth(nextTime);
  }

  nextMonth(): void {
    const nextTime = moment(this.monthOpt.original.time)
      .add(1, 'months')
      .valueOf();
    this.monthChange.emit({
      oldMonth: this.calSvc.multiFormat(this.monthOpt.original.time),
      newMonth: this.calSvc.multiFormat(nextTime),
    });
    this.monthOpt = this.createMonth(nextTime);
  }

  canNext(): boolean {
    if (!this._d.to || this._view !== 'days') return true;
    return this.monthOpt.original.time < moment(this._d.to).valueOf();
  }

  backMonth(): void {
    const backTime = moment(this.monthOpt.original.time)
      .subtract(1, 'months')
      .valueOf();
    this.monthChange.emit({
      oldMonth: this.calSvc.multiFormat(this.monthOpt.original.time),
      newMonth: this.calSvc.multiFormat(backTime),
    });
    this.monthOpt = this.createMonth(backTime);
  }

  canBack(): boolean {
    if (!this._d.from || this._view !== 'days') return true;
    return this.monthOpt.original.time > moment(this._d.from).valueOf();
  }

  monthOnSelect(month: number | any): void {
    this._view = 'days';
    const newMonth = moment(this.monthOpt.original.time)
      .month(month)
      .valueOf();
    this.monthChange.emit({
      oldMonth: this.calSvc.multiFormat(this.monthOpt.original.time),
      newMonth: this.calSvc.multiFormat(newMonth),
    });
    this.monthOpt = this.createMonth(newMonth);
  }

  onChanged($event: CalendarDay[]): void {
    switch (this._d.pickMode) {
      case pickModes.SINGLE:
        const date = this._handleType($event[0].time);
        this._onChanged(date);
        this.change.emit(date);
        break;

      case pickModes.RANGE:
        if ($event[0] && $event[1]) {
          const rangeDate = {
            from: this._handleType($event[0].time),
            to: this._handleType($event[1].time),
          };
          this._onChanged(rangeDate);
          this.change.emit(rangeDate);
        }
        break;

      case pickModes.MULTI:
        const dates = [];

        for (let i = 0; i < $event.length; i++) {
          if ($event[i] && $event[i].time) {
            dates.push(this._handleType($event[i].time));
          }
        }

        this._onChanged(dates);
        this.change.emit(dates);
        break;

      default:
    }
  }

  swipeEvent($event: any): void {
    const isNext = $event.deltaX < 0;
    if (isNext && this.canNext()) {
      this.nextMonth();
    } else if (!isNext && this.canBack()) {
      this.backMonth();
    }
  }

  _onChanged: Function = () => { };

  _onTouched: Function = () => { };

  _payloadToTimeNumber(value: CalendarComponentPayloadTypes): number {
    let date;
    if (this.type === 'string') {
      date = moment(value, this.format);
    } else {
      date = moment(value);
    }
    return date.valueOf();
  }

  _monthFormat(date: number): string {
    return moment(date).format(this._d.monthFormat.replace(/y/g, 'Y'));
  }

  private initOpt(): void {
    if (this._options && typeof this._options.showToggleButtons === 'boolean') {
      this.showToggleButtons = this._options.showToggleButtons;
    }
    if (this._options && typeof this._options.showMonthPicker === 'boolean') {
      this.showMonthPicker = this._options.showMonthPicker;
      if (this._view !== 'days' && !this.showMonthPicker) {
        this._view = 'days';
      }
    }
    this._d = this.calSvc.safeOpt(this._options || {});
  }

  createMonth(date: number): CalendarMonth {
    return this.calSvc.createMonthsByPeriod(date, 1, this._d)[0];
  }

  _createCalendarDay(value: CalendarComponentPayloadTypes): CalendarDay {
    return this.calSvc.createCalendarDay(this._payloadToTimeNumber(value), this._d);
  }

  _handleType(value: number): CalendarComponentPayloadTypes {
    const date = moment(value);
    switch (this.type) {
      case 'string':
        return date.format(this.format);
      case 'js-date':
        return date.toDate();
      case 'moment':
        return date;
      case 'time':
        return date.valueOf();
      case 'object':
        return date.toObject();
    }
    return date;
  }

  writeValue(obj: any): void {
    this._writeValue(obj);
    if (obj) {
      if (this._calendarMonthValue[0]) {
        this.monthOpt = this.createMonth(this._calendarMonthValue[0].time);
      } else {
        this.monthOpt = this.createMonth(new Date().getTime());
      }
    }
  }

  registerOnChange(fn: () => {}): void {
    this._onChanged = fn;
  }

  registerOnTouched(fn: () => {}): void {
    this._onTouched = fn;
  }

  _writeValue(value: any): void {
    if (!value) {
      this._calendarMonthValue = [null, null];
      return;
    }

    switch (this._d.pickMode) {
      case 'single':
        this._calendarMonthValue[0] = this._createCalendarDay(value);
        break;

      case 'range':
        if (value.from) {
          this._calendarMonthValue[0] = value.from ? this._createCalendarDay(value.from) : null;
        }
        if (value.to) {
          this._calendarMonthValue[1] = value.to ? this._createCalendarDay(value.to) : null;
        }
        break;

      case 'multi':
        if (Array.isArray(value)) {
          this._calendarMonthValue = value.map(e => {
            return this._createCalendarDay(e);
          });
        } else {
          this._calendarMonthValue = [null, null];
        }
        break;

      default:
    }
  }
}
