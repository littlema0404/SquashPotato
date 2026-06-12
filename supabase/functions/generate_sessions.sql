-- ============================================================
-- generate_sessions.sql
-- 用途：自動產生週五、週六、週日的打球場次
-- ============================================================
-- 使用方式：
--   1. 先在 SQL Editor 執行本檔案以建立 function
--   2. 呼叫 function 產生資料：
--        SELECT generate_sessions('2026-06-12', '2026-12-31');
--   3. 若要清除舊資料再重新產生：
--        DELETE FROM sessions;
--        SELECT generate_sessions('2026-06-12', '2026-12-31');
-- ============================================================
-- 產出規則：
--   週五：週五打球登記, 20:00-22:00, 2 場
--   週六：週六打球登記, 14:00-18:00, 1 場
--   週日：週日打球登記, 14:00-18:00, 2 場
--   地點：北投運動中心
-- ============================================================

CREATE OR REPLACE FUNCTION generate_sessions(start_date DATE, end_date DATE)
RETURNS void AS $$
DECLARE
  d DATE := start_date;
  weekday INT;
BEGIN
  WHILE d <= end_date LOOP
    weekday := EXTRACT(DOW FROM d);

    IF weekday = 5 THEN -- 週五
      INSERT INTO sessions (title, date, start_time, end_time, location, court_count)
      VALUES ('週五打球登記', d, '20:00', '22:00', '北投運動中心', 2);

    ELSIF weekday = 6 THEN -- 週六
      INSERT INTO sessions (title, date, start_time, end_time, location, court_count)
      VALUES ('週六打球登記', d, '14:00', '18:00', '北投運動中心', 1);

    ELSIF weekday = 0 THEN -- 週日
      INSERT INTO sessions (title, date, start_time, end_time, location, court_count)
      VALUES ('週日打球登記', d, '14:00', '18:00', '北投運動中心', 2);
    END IF;

    d := d + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
