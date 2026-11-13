def small(elevations=(10,20,15), waypoint=''):
    points = ''.join(f'<trkpt lat="28" lon="{121+i*.01}">{"" if z is None else f"<ele>{z}</ele>"}</trkpt>' for i,z in enumerate(elevations))
    return f'<gpx>{waypoint}<trk><name>测试路线</name><trkseg>{points}</trkseg></trk></gpx>'


def cases(root):
    real = (root/'且听风吟60K.gpx').read_text()
    yield 'midnight start', {'gpx':small(),'target':'03:00','options':{'start_time':'00:00','secondary_display':'arrival_time'}}
    yield 'overnight arrival', {'gpx':small(),'target':'03:00','options':{'start_time':'23:30','secondary_display':'arrival_time'}}
    yield 'confirmed real route', {'gpx':real,'filename':'且听风吟60K.gpx','target':'12:00'}
    yield 'missing elevation', {'gpx':small((None,20,None,40,None)),'target':'03:00'}
    yield 'all missing', {'gpx':small((None,None)),'target':'03:00'}
    cp = small(waypoint='<wpt lat="28" lon="121.01"><name>CP1</name></wpt>')
    yield 'rest and cutoff over 24 hours', {'gpx':cp,'target':'30:00','options':{'targets':['30:00'],'secondary_display':'arrival_time','checkpoint_overrides':{'wpt:1':{'rest_minutes':12,'cutoff':'01:00'}}}}
    yield 'invalid rest', {'gpx':cp,'target':'01:00','options':{'targets':['01:00'],'checkpoint_overrides':{'wpt:1':{'rest_minutes':90}}}}
    yield 'short five targets', {'gpx':small(),'target':'00:30'}
    yield 'short single target', {'gpx':small(),'target':'00:30','options':{'targets':['00:30']}}
    yield 'no smoothing', {'gpx':real,'target':'12:00','options':{'ascent_smoothing_m':0,'ascent_threshold_m':30,'secondary_display':'equivalent_pace'}}
    yield 'manual checkpoints', {'gpx':small(),'target':'03:00','options':{'checkpoints':[{'name':'=危险,<script>站名</script>','distance_km':.5,'rest_minutes':5},{'name':'终点','distance_km':1.963567003}]}}
    multi=small().replace('</gpx>','<trk><name>另一条</name><trkseg><trkpt lat="29" lon="121"><ele>20</ele></trkpt><trkpt lat="29" lon="121.01"><ele>30</ele></trkpt></trkseg></trk></gpx>')
    yield 'multiple tracks ambiguous', {'gpx':multi,'target':'03:00'}
    yield 'multiple tracks selected', {'gpx':multi,'target':'03:00','options':{'track_index':2}}
    yield 'invalid parameter', {'gpx':small(),'target':'03:00','options':{'fatigue_rate':2}}
    yield 'invalid coordinates', {'gpx':small().replace('lat="28"','lat="99"'),'target':'03:00'}
    yield 'disconnected segments', {'gpx':'<gpx><trk><trkseg><trkpt lat="28" lon="121"><ele>20</ele></trkpt><trkpt lat="28" lon="121.01"><ele>30</ele></trkpt></trkseg><trkseg><trkpt lat="29" lon="122"><ele>20</ele></trkpt><trkpt lat="29" lon="122.01"><ele>30</ele></trkpt></trkseg></trk></gpx>','target':'03:00'}
    yield 'dateline crossing', {'gpx':'<gpx><rte><rtept lat="28" lon="179.999"><ele>10</ele></rtept><rtept lat="28" lon="-179.999"><ele>30</ele></rtept></rte></gpx>','target':'03:00'}
