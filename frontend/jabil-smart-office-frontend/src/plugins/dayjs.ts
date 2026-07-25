import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import isoWeek from 'dayjs/plugin/isoWeek'
import isBetween from 'dayjs/plugin/isBetween'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(weekday)
dayjs.extend(isoWeek)
dayjs.extend(isBetween)
dayjs.extend(utc)
dayjs.extend(timezone)

// 设置默认时区为上海时间
dayjs.tz.setDefault('Asia/Shanghai')

export default dayjs
