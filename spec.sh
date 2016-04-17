#!/bin/bash

if [ $1 = "create" ]
then
    git checkout master
    if [ $2 = "todo" ]
    then
      git checkout -b feat/issue-$3
      git push -u origin feat/issue-$3
      mkdir spec/libsass-todo-issues/issue_$3
      touch spec/libsass-todo-issues/issue_$3/{input.scss,expected_output.css}
      subl spec/libsass-todo-issues/issue_$3/input.scss
      git add spec/libsass-todo-issues/issue_$3
      git commit -m "Add specs for issue $3" -m "This PR add specs for sass/libsass#$3"
    elif [ $2 = "closed" ]
    then
      git checkout -b feat/activate-$3
      git push -u origin feat/activate-$3
      mkdir spec/libsass-closed-issues/issue_$3
      touch spec/libsass-closed-issues/issue_$3/{input.scss,expected_output.css}
      subl spec/libsass-closed-issues/issue_$3/input.scss
      git add spec/libsass-closed-issues/issue_$3
      git commit -m "Activate specs for issue $3" -m "This PR activates specs for sass/libsass#$3"
    fi
elif [ $1 = "nuke" ]
then
    if [ $2 = "todo" ]
    then
        ruby sass-spec.rb -c sass spec/libsass-todo-issues/issue_$3 --nuke
    elif [ $2 = "closed" ]
    then
        ruby sass-spec.rb -c sass spec/libsass-closed-issues/issue_$3 --nuke
    fi
elif [ $1 = "assert" ]
then
    if [ $2 = "todo" ]
    then
        ruby sass-spec.rb -c ~/Projects/Sass/sassc/bin/sassc -s spec/libsass-todo-issues/issue_$3
    elif [ $2 = "closed" ]
    then
        ruby sass-spec.rb -c ~/Projects/Sass/sassc/bin/sassc -s spec/libsass-closed-issues/issue_$3
    fi
elif [ $1 = "enable" ]
then
  # git checkout master
  git mv spec/libsass-todo-issues/issue_$2 spec/libsass-closed-issues
elif [ $1 = "activate" ]
then
  git checkout master
  git checkout -b feat/activate-$2
  git push -u origin feat/activate-$2
  git mv spec/libsass-todo-issues/issue_$2 spec/libsass-closed-issues
  git add spec/libsass-closed-issues/issue_$2
  git commit -m "Activate specs for issue $2" -m "This PR activates specs for sass/libsass#$2"
elif [ $1 = "pr" ]
then
  git push
elif [ $1 = "update" ]
then
  git checkout master
  git fetch upstream
  git merge upstream/master
  git push
fi

# git checkout master
# git checkout -b feat/issue-$1
# mkdir spec/libsass-todo-issues/issue_$1
# touch spec/libsass-todo-issues/issue_$1/{input.scss,expected_output.css}
# subl spec/libsass-todo-issues/issue_$1/input.scss
