import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { TaskService } from '../../features/tasks/task.service';
import { expandAnimation, expandFadeAnimation } from '../../ui/animations/expand.ani';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { DragulaService } from 'ng2-dragula';
import { TakeABreakService } from '../../features/time-tracking/take-a-break/take-a-break.service';
import { ActivatedRoute } from '@angular/router';
import { from, Subscription, timer, zip } from 'rxjs';
import { TaskWithSubTasks } from '../../features/tasks/task.model';
import { map, skip, switchMap, take, withLatestFrom } from 'rxjs/operators';
import { fadeAnimation } from '../../ui/animations/fade.ani';

@Component({
  selector: 'work-view',
  templateUrl: './work-view-page.component.html',
  styleUrls: ['./work-view-page.component.scss'],
  animations: [expandFadeAnimation, expandAnimation, fadeAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkViewPageComponent implements OnInit, OnDestroy {
  isShowTimeWorkedWithoutBreak = true;
  // no todays tasks at all
  isPlanYourDay: boolean = undefined;
  splitInputPos = 100;

  // we do it here to have the tasks in memory all the time
  backlogTasks: TaskWithSubTasks[];

  // NOTE: not perfect but good enough for now
  isTriggerSwitchListAni$ = this.taskService.onTaskSwitchList$.pipe(
    switchMap(() =>
      zip(
        from([true, false]),
        timer(1, 200),
      ),
    ),
    map(v => v[0]),
  );

  private _subs = new Subscription();
  private _switchListAnimationTimeout: number;

  constructor(
    public taskService: TaskService,
    public takeABreakService: TakeABreakService,
    private _layoutService: LayoutService,
    private _dragulaService: DragulaService,
    private _activatedRoute: ActivatedRoute,
  ) {
  }


  ngOnInit() {
    this._dragulaService.createGroup('PARENT', {
      direction: 'vertical',
      moves: function (el, container, handle) {
        // console.log('moves par', handle.className, handle.className.indexOf('handle-par') > -1);
        return handle.className.indexOf && handle.className.indexOf('handle-par') > -1;
      }
    });

    this._dragulaService.createGroup('SUB', {
      direction: 'vertical',
      moves: function (el, container, handle) {
        // console.log('moves sub', handle.className, handle.className.indexOf('handle-sub') > -1);
        return handle.className.indexOf && handle.className.indexOf('handle-sub') > -1;
      }
    });

    this._subs.add(this.taskService.backlogTasks$.subscribe(tasks => this.backlogTasks = tasks));

    // TODO improve
    this._subs.add(
      this.taskService.isTriggerPlanningMode$.pipe(
        // skip default
        skip(1),
        take(1),
        withLatestFrom(this.taskService.backlogTasks$),
      )
        .subscribe(([isPlanning, backlogTasks]) => {
          this.isPlanYourDay = isPlanning;
          if (isPlanning && backlogTasks && backlogTasks.length) {
            this.splitInputPos = 50;
          }
        })
    );

    this._subs.add(this._activatedRoute.queryParams
      .subscribe((params) => {
        if (params && params.backlogPos) {
          this.splitInputPos = params.backlogPos;
        }
      }));
  }


  ngOnDestroy() {
    this._dragulaService.destroy('PARENT');
    this._dragulaService.destroy('SUB');
    if (this._switchListAnimationTimeout) {
      window.clearTimeout(this._switchListAnimationTimeout);
    }
  }

  showAddTaskBar() {
    this._layoutService.showAddTaskBar();
  }

  startWork() {
    this.isPlanYourDay = false;
    this._subs.add(this.taskService.startableTasks$
      .pipe(take(1))
      .subscribe(tasks => {
        const nextTaskId = tasks && tasks[0] && tasks[0].id;
        if (nextTaskId) {
          this.taskService.setCurrentId(tasks && tasks[0] && tasks[0].id);
        }
      }));
  }
}
