import { Component, Input, OnInit, Output, EventEmitter, forwardRef, Provider } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { DateTime } from 'luxon';
import { DateTimeHelper } from '../../helpers';

import { IonCalendarService } from '../../ion-calendar.service';
import { ICalendarComponentMonthChange, ICalendarComponentOptions, ICalendarComponentWeekChange, ICalendarDay, ICalendarModalOptions, ICalendarMonth } from '../../models';
import defaultValues, { CalendarComponentPayloadType, CalendarComponentType, pickModes } from '../../types';

export const ION_CAL_VALUE_ACCESSOR: Provider = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => CalendarComponent),
  multi: true,
};
@Component({
  selector: 'ion-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['../index.scss', './calendar.component.scss'],
  providers: [ION_CAL_VALUE_ACCESSOR],
})
export class CalendarComponent implements ControlValueAccessor, OnInit {

  def!: ICalendarModalOptions;
  monthOpt!: ICalendarMonth;
  calendarMonthValue: Array<ICalendarDay | null> = [null, null];
  view: 'year' | 'month' | 'days' = 'days';
  yearStep: number = 0;

  private _showToggleButtons = true;
  get showToggleButtons(): boolean {
    return this._showToggleButtons;
  }
  set showToggleButtons(value: boolean) {
    this._showToggleButtons = value;
  }

  private _showMonthPicker = true;
  get showMonthPicker(): boolean {
    return this._showMonthPicker;
  }
  set showMonthPicker(value: boolean) {
    this._showMonthPicker = value;
  }

  // private _showYearPicker = true;
  // private get showYearPicker(): boolean {
  //   return this._showYearPicker;
  // }
  // private set showYearPicker(value: boolean) {
  //   this._showYearPicker = value;
  // }

  private _options: ICalendarComponentOptions = {};
  get options(): ICalendarComponentOptions {
    return this._options;
  }

  @Input() set options(value: ICalendarComponentOptions) {
    this._options = value;
    this.initOpt();
    if (this.monthOpt && this.monthOpt.original) {
      //this.monthOpt = this.createMonth(this.monthOpt.original.time);
      this.createWeekOrMonth(this.monthOpt.original.time);
    }
  }

  @Input() color: string | undefined = undefined;
  @Input() format: string = defaultValues.DATE_FORMAT;
  @Input() type: CalendarComponentType = 'string';
  @Input() readonly = false;

  @Output() change: EventEmitter<CalendarComponentPayloadType | any> = new EventEmitter();
  @Output() monthChange: EventEmitter<ICalendarComponentMonthChange | any> = new EventEmitter();
  @Output() weekChange: EventEmitter<ICalendarComponentWeekChange | any> = new EventEmitter();
  @Output() select: EventEmitter<ICalendarDay | any> = new EventEmitter();
  @Output() selectStart: EventEmitter<ICalendarDay | any> = new EventEmitter();
  @Output() selectEnd: EventEmitter<ICalendarDay | any> = new EventEmitter();

  // private readonly MONTH_DATE_FORMAT = 'MMMM yyyy';
  constructor(public calSvc: IonCalendarService) { }

  ngOnInit(): void {
    this.initOpt();
    this.createWeekOrMonth(new Date().getTime());
    console.log(">>> monthOpt", this.monthOpt);
  }

  getViewDate() {
    return this._handleType(this.monthOpt?.original?.time ?? 0);
  }

  getDate(date: number) {
    return new Date(date);
  }

  setViewDate(value: CalendarComponentPayloadType) {
    this.createWeekOrMonth(this._payloadToTimeNumber(value));
  }

  switchView(): void {
    this.view = this.view === 'days'
      ? ((this.options.showYearPicker??true) ? 'year' : 'month')
      : (this.view === 'year' ? 'month' : 'days');
  }

  switchIcon(): string {
    return this.view === 'days'
      ? 'caret-down'
      : (this.options.showYearPicker?? true) && this.view === 'year' ? 'caret-down' : 'caret-up';
  }

  prev(): void {
    if (this.view === 'days') {
      if (this.def.displayMode === 'week') {
        this.backWeek();
      } else {
        this.backMonth();
      }
    } else if (this.view === 'month') {
      this.prevYear();
    } else {
      this.yearStep -= 1;
    }
  }

  next(): void {
    if (this.view === 'days') {
      if (this.def.displayMode === 'week') {
        this.nextWeek();
      } else {
        this.nextMonth();
      }
    } else if (this.view === 'month') {
      this.nextYear();
    } else {
      this.yearStep += 1;
    }
  }

  private prevYear(): void {
    // if (moment(this.monthOpt.original.time).year() === 1970) { return; }
    //const backTime = moment(this.monthOpt.original.time).subtract(1, 'year').valueOf();
    const backTime = DateTime.fromMillis(this.monthOpt.original.time).minus({ year: 1 }).valueOf();
    this.createWeekOrMonth(backTime);
  }

  private nextYear(): void {
    // const nextTime = moment(this.monthOpt.original.time).add(1, 'year').valueOf();
    const nextTime = DateTime.fromMillis(this.monthOpt.original.time).plus({ year: 1 }).valueOf();
    this.createWeekOrMonth(nextTime);
  }

  private nextMonth() {
    //const nextTime = moment(this.monthOpt.original.time).add(1, 'months').valueOf();
    const nextTime = DateTime.fromMillis(this.monthOpt.original.time).plus({ months: 1 }).valueOf();
    this.monthChange.emit({
      oldMonth: this.calSvc.multiFormat(this.monthOpt.original.time),
      newMonth: this.calSvc.multiFormat(nextTime),
    });
    this.monthOpt = this.createMonth(nextTime);
  }

  private nextWeek() {
    let oldWeek = this.calSvc.multiFormat(this.monthOpt.original.time);
    // let nextTime = moment(this.monthOpt.original.time).add(this.def.weeks, 'weeks').valueOf();
    let nextTime = DateTime.fromMillis(this.monthOpt.original.time).plus({ weeks: this.def.weeks }).valueOf();
    let newWeek = this.calSvc.multiFormat(nextTime);

    if (oldWeek.month != newWeek.month && !this.def.continuous) {
      // let _start = new Date(nextTime);
      // nextTime = new Date(_start.getFullYear(), _start.getMonth(), 1).getTime();
      nextTime = DateTime.fromMillis(nextTime).set({ day: 1 }).valueOf();
      newWeek = this.calSvc.multiFormat(nextTime);
    }

    this.monthOpt = this.createWeek(nextTime);
    this.weekChange.emit({ oldWeek: oldWeek, newWeek: this.calSvc.multiFormat(this.monthOpt.original.time), });

    if (oldWeek.month != newWeek.month) {
      this.monthChange.emit({ oldMonth: oldWeek, newMonth: this.calSvc.multiFormat(this.monthOpt.original.time), });
    }
  }


  canNext(): boolean {
    if (!this.def.to || this.view !== 'days') return true;
    // if (!this.def.to) return true;

    // return this.monthOpt.original.time < moment(this.def.to).valueOf();
    // const toMillis = (this.def.to instanceof Date) ? this.def.to.getTime() : this.def.to;
    // return this.monthOpt.original.time < DateTime.fromMillis(toMillis).toMillis();

    const toDate = DateTimeHelper.parse(this.def.to);
    return this.monthOpt.original.lastDay < toDate.toMillis();
  }

  private backMonth(): void {
    // const backTime = moment(this.monthOpt.original.time).subtract(1, 'months').valueOf();
    const backTime = DateTime.fromMillis(this.monthOpt.original.time).minus({ months: 1 }).valueOf();
    this.monthChange.emit({
      oldMonth: this.calSvc.multiFormat(this.monthOpt.original.time),
      newMonth: this.calSvc.multiFormat(backTime),
    });
    this.monthOpt = this.createMonth(backTime);
  }

  private backWeek(): void {
    // let backTime = moment(this.monthOpt.original.time).subtract(this.def.weeks, 'weeks').valueOf();
    let backTime = DateTime.fromMillis(this.monthOpt.original.time).minus({ weeks: this.def.weeks }).valueOf();
    let oldWeek = this.calSvc.multiFormat(this.monthOpt.original.time);
    let newWeek = this.calSvc.multiFormat(backTime);

    if (oldWeek.month != newWeek.month && !this.def.continuous) {
      let _start = new Date(this.monthOpt.original.time);
      let dayToSubstrac = _start.getDay();
      if (this.options.weekStart === 1) {
        dayToSubstrac--;
        if (dayToSubstrac < 0) {
          dayToSubstrac = 6;
        }
      }

      let firstDayMonth = new Date(_start.getFullYear(), _start.getMonth(), 1).getTime();
      // let momentBackTime = moment(firstDayMonth);
      let momentBackTime = DateTime.fromMillis(firstDayMonth);
      if (_start.getDate() - dayToSubstrac <= 1) {
        // momentBackTime = momentBackTime.subtract(1, 'd');
        momentBackTime = momentBackTime.minus({ days: 1 });
      }
      backTime = momentBackTime.valueOf();

      newWeek = this.calSvc.multiFormat(backTime);
    }
    this.weekChange.emit({ oldWeek: oldWeek, newWeek: newWeek, });
    if (oldWeek.month != newWeek.month) {
      this.monthChange.emit({ oldMonth: oldWeek, newMonth: newWeek, });
    }
    this.monthOpt = this.createWeek(backTime);
  }

  canPrev(): boolean {
    // if (!this._d.from || this._view !== 'days') { return true; }
    if (!this.def.from || this.view !== 'days') return true;
    // return this.monthOpt.original.time >  moment(this.def.from).valueOf();
    const fromDate = DateTimeHelper.parse(this.def.from);
    return this.monthOpt.original.time > fromDate.valueOf();
  }

  onMonthSelect(month: number | any): void {
    this.view = 'days';

    // const newMonth = moment(this.monthOpt.original.time).month(month).valueOf();
    const newMonth = DateTimeHelper.parse(this.monthOpt.original.time).set({ month }).valueOf();
    this.monthChange.emit({
      oldMonth: this.calSvc.multiFormat(this.monthOpt.original.time),
      newMonth: this.calSvc.multiFormat(newMonth),
    });
    this.createWeekOrMonth(newMonth);
  }

  public onYearSelect(year: number | any): void {
    this.view = 'month';

    // const newYear = moment(this.monthOpt.original.time).year(year).valueOf();
    const newYear = DateTimeHelper.parse(this.monthOpt.original.time).set({ year }).valueOf();
    this.monthChange.emit({
      oldMonth: this.calSvc.multiFormat(this.monthOpt.original.time),
      newMonth: this.calSvc.multiFormat(newYear),
    });
    this.monthOpt = this.createMonth(newYear);
  }

  onChanged($event: ICalendarDay[] | any): void {
    const eCD: ICalendarDay[] = $event;

    this.yearStep = 0;

    switch (this.def.pickMode) {
      case pickModes.SINGLE:
        const date = this._handleType(eCD[0].time);
        this._onChanged(date);
        this.change.emit(date);
        break;

      case pickModes.RANGE:
        if (eCD[0] && eCD[1]) {
          const rangeDate = {
            from: this._handleType(eCD[0].time),
            to: this._handleType(eCD[1].time),
          };
          this._onChanged(rangeDate);
          this.change.emit(rangeDate);
        }
        break;

      case pickModes.MULTI:
        const dates = [];

        for (let i = 0; i < eCD.length; i++) {
          if (eCD[i] && eCD[i].time) {
            dates.push(this._handleType(eCD[i].time));
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
    } else if (!isNext && this.canPrev()) {
      this.backMonth();
    }
  }

  private _onChanged: Function = () => { };
  private _onTouched: Function = () => { };

  private _payloadToTimeNumber(value: CalendarComponentPayloadType): number {
    // let date;
    // if (this.type === 'string') {
    //   date = moment(value, this.format);
    // } else {
    //   date = moment(value);
    // }

    // const date = this.type === 'string'
    const date = typeof value === 'string'
      ? DateTime.fromFormat(value as string, this.format.replace(/Y/g, 'y'))
      : DateTimeHelper.parse(value);

    return date.valueOf();
  }




  monthFormat(date: number | any): string {
    if (!this.def.monthFormat) return '';
    // return moment(date).format(this.def.monthFormat.replace(/y/g, 'Y'));
    return DateTimeHelper.parse(date).toFormat(this.def.monthFormat.replace(/Y/g, 'y'));
  }

  private initOpt(): void {
    console.log("calendar.component ~ initOpt()");
    //if (this._options) {

    this.showToggleButtons = this._options.showToggleButtons ?? true;
    this.showMonthPicker = this._options.showMonthPicker ?? true;

    if (this.view !== 'days' && !this.showMonthPicker) {
      this.view = 'days';
    }

    if (this.color && this.color !== this.options.color) {
      this.options.color = this.color;
    }

    //}

    this.def = this.calSvc.safeOpt(this._options);
    this._options = {
      ...this._options,
      ...this.def,
    }
  }

  private createWeekOrMonth(time: number) {
    if (this.def.displayMode === 'week') {
      this.monthOpt = this.createWeek(time);
    } else {
      this.monthOpt = this.createMonth(time);
    }
  }

  private createWeek(date: number): ICalendarMonth {
    const period = this.calSvc.createWeeksByPeriod(date, this.def);
    return period[0];
  }
  private createMonth(date: number): ICalendarMonth {
    const period = this.calSvc.createMonthsByPeriod(date, 1, this.def);
    return period[0];
  }

  private _createCalendarDay(value: CalendarComponentPayloadType): ICalendarDay {
    return this.calSvc.createCalendarDay(this._payloadToTimeNumber(value), this.def);
  }

  private _handleType(value: number): CalendarComponentPayloadType {
    // const date = moment(value);
    const date = DateTimeHelper.parse(value);
    switch (this.type) {
      case 'string':
        // return date.format(this.format);
        return date.toFormat(this.format.replace(/Y/g, 'y'));
      case 'js-date':
        // return date.toDate();
        return date.toJSDate();
      // case 'moment':
      case 'luxon':
        return date;
      case 'time':
        return date.valueOf();
      case 'object':
        return date.toObject();
      default:
        return date;
    }
  }

  writeValue(obj: any): void {
    this._writeValue(obj);
    if (obj) {
      if (this.calendarMonthValue[0]) {
        //this.monthOpt = this.createMonth(this._calendarMonthValue[0].time);
        if (!Number.isNaN(this.calendarMonthValue[0].time))
          this.createWeekOrMonth(this.calendarMonthValue[0].time);
      } else {
        // this.monthOpt = this.createMonth(new Date().getTime());
        this.createWeekOrMonth(new Date().getTime());
      }
    }
  }

  registerOnChange(fn: () => {}): void {
    this._onChanged = fn;
  }

  registerOnTouched(fn: () => {}): void {
    this._onTouched = fn;
  }

  private _writeValue(value: any): void {
    if (!value) {
      this.calendarMonthValue = [null, null];
      return;
    }

    switch (this.def.pickMode) {
      case 'single':
        this.calendarMonthValue[0] = this._createCalendarDay(value);
        break;

      case 'range':
        if (value.from) {
          this.calendarMonthValue[0] = value.from ? this._createCalendarDay(value.from) : null;
        }
        if (value.to) {
          this.calendarMonthValue[1] = value.to ? this._createCalendarDay(value.to) : null;
        }
        break;

      case 'multi':
        if (Array.isArray(value)) {
          this.calendarMonthValue = value.map(e => {
            return this._createCalendarDay(e);
          });
        } else {
          this.calendarMonthValue = [null, null];
        }
        break;

      default:
    }
  }
}